import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'backend', 'database.db');

// Initialize sql.js
const SQL = await initSqlJs();
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

// Query for the test project
const result = db.exec("SELECT id, name, description FROM projects WHERE name = 'TEST_PERSIST_12345'");

if (result.length > 0 && result[0].values.length > 0) {
  const project = result[0].values[0];
  console.log('✓ Test project found in DISK database file:');
  console.log(`  ID: ${project[0]}`);
  console.log(`  Name: ${project[1]}`);
  console.log(`  Description: ${project[2] || '(none)'}`);
  console.log('');
  console.log('✓ FEATURE 3 VERIFIED: Data persists to disk');
  db.close();
  process.exit(0);
} else {
  console.log('✗ Test project NOT found in disk database');
  db.close();
  process.exit(1);
}
