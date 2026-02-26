import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';

const DB_PATH = './backend/database.db';

// Initialize sql.js
const SQL = await initSqlJs();
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

// Query for the test project
const result = db.exec("SELECT id, name, description FROM projects WHERE name = 'TEST_PERSIST_12345'");

if (result.length > 0 && result[0].values.length > 0) {
  const project = result[0].values[0];
  console.log('✓ Test project found in database:');
  console.log(`  ID: ${project[0]}`);
  console.log(`  Name: ${project[1]}`);
  console.log(`  Description: ${project[2] || '(none)'}`);
  console.log('');
  console.log('✓ DATA PERSISTENCE VERIFIED: Project exists in database file');
} else {
  console.log('✗ Test project NOT found in database');
  process.exit(1);
}

// Also query for the other test project we created
const result2 = db.exec("SELECT id, name, description FROM projects WHERE name = 'Test Living Room'");
if (result2.length > 0 && result2[0].values.length > 0) {
  const project = result2[0].values[0];
  console.log('');
  console.log('✓ Additional test project found:');
  console.log(`  ID: ${project[0]}`);
  console.log(`  Name: ${project[1]}`);
  console.log(`  Description: ${project[2]}`);
}

db.close();
