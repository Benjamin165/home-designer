import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const initSqlJs = require('./backend/node_modules/sql.js/dist/sql-wasm.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'backend/database.db');

console.log('=== Verifying API Key Encryption (Feature #62) ===\n');

const SQL = await initSqlJs();
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

// Query the trellis_api_key from user_settings
const result = db.exec(`SELECT key, value, encrypted FROM user_settings WHERE key = 'trellis_api_key'`);

if (result.length === 0 || result[0].values.length === 0) {
  console.log('❌ No trellis_api_key found in database');
  process.exit(1);
}

const [key, value, encrypted] = result[0].values[0];

console.log(`Key: ${key}`);
console.log(`Encrypted flag: ${encrypted === 1 ? 'YES' : 'NO'}`);
console.log(`Stored value (encrypted): ${value.substring(0, 50)}...`);
console.log(`Value length: ${value.length} characters`);

// Verify it's NOT plain text
const plainText = 'test_trellis_api_key_1234567890abcdef';
if (value === plainText) {
  console.log('\n❌ FAILURE: API key is stored as PLAIN TEXT!');
  process.exit(1);
}

// Verify encrypted flag is set
if (encrypted !== 1) {
  console.log('\n❌ FAILURE: Encrypted flag is not set!');
  process.exit(1);
}

// Verify value looks encrypted (contains colon separator from IV:encrypted format)
if (!value.includes(':')) {
  console.log('\n❌ FAILURE: Value does not appear to be encrypted (missing IV:encrypted format)!');
  process.exit(1);
}

console.log('\n✅ SUCCESS: API key is encrypted at rest');
console.log('✅ Encrypted flag is set correctly');
console.log('✅ Value is NOT plain text');
console.log('✅ Format matches encryption pattern (IV:ciphertext)');

db.close();
