import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'database.db');

console.log('Testing foreign keys with sql.js...\n');

// Initialize sql.js
const SQL = await initSqlJs();

// Load database
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

console.log('Before enabling foreign keys:');
let result = db.exec('PRAGMA foreign_keys');
console.log('Result:', result);
console.log('Enabled:', result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 'N/A');

console.log('\nEnabling foreign keys with exec()...');
db.exec('PRAGMA foreign_keys = ON');

console.log('\nAfter enabling foreign keys:');
result = db.exec('PRAGMA foreign_keys');
console.log('Result:', result);
console.log('Enabled:', result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : 'N/A');

db.close();
console.log('\n✓ Test complete');
