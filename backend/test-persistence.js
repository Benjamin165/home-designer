import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'database.db');

console.log('Testing data persistence in database file...\n');

// Initialize sql.js
const SQL = await initSqlJs();

// Load database file from disk
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

// Query for the test project
const result = db.exec("SELECT * FROM projects WHERE name = 'TEST_PERSIST_12345'");

if (result.length > 0 && result[0].values.length > 0) {
  console.log('✓ Test project found in database file on disk!');
  console.log('  Project data:', result[0].values[0]);
  console.log('\n✅ Data persistence verified - data is saved to disk');
} else {
  console.log('❌ Test project NOT found in database file');
  console.log('   This means data is only in memory, not persisted to disk');
}

db.close();
