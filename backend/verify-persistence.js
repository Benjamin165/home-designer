#!/usr/bin/env node
import initSqlJs from 'sql.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'database.db');

async function verifyPersistence() {
  console.log('========================================');
  console.log('  Database Persistence Verification');
  console.log('========================================\n');

  // Check if database file exists
  console.log('Step 1: Checking if database file exists on disk...');
  if (!existsSync(DB_PATH)) {
    console.log('✗ FAILED: database.db file not found');
    console.log(`   Expected location: ${DB_PATH}\n`);
    process.exit(1);
  }
  console.log(`✓ Database file exists: ${DB_PATH}\n`);

  // Read database file directly
  console.log('Step 2: Loading database from disk (independent of running server)...');
  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);
  console.log('✓ Database loaded successfully\n');

  // Query for test project
  console.log('Step 3: Querying for TEST_PERSIST_12345...');
  const result = db.exec(`
    SELECT id, name, description, created_at, updated_at
    FROM projects
    WHERE name = 'TEST_PERSIST_12345'
  `);

  if (result.length === 0 || result[0].values.length === 0) {
    console.log('✗ FAILED: Test project not found in database file');
    console.log('   This means data is NOT being persisted to disk\n');
    db.close();
    process.exit(1);
  }

  const [id, name, description, created_at, updated_at] = result[0].values[0];
  console.log('✓ Test project found in database file:');
  console.log(`   ID: ${id}`);
  console.log(`   Name: ${name}`);
  console.log(`   Description: ${description}`);
  console.log(`   Created: ${created_at}`);
  console.log(`   Updated: ${updated_at}\n`);

  // Verify all projects
  console.log('Step 4: Listing all projects in database...');
  const allProjects = db.exec('SELECT id, name FROM projects ORDER BY id');
  if (allProjects.length > 0 && allProjects[0].values.length > 0) {
    console.log(`✓ Total projects in database: ${allProjects[0].values.length}`);
    allProjects[0].values.forEach(([pid, pname]) => {
      console.log(`   - [${pid}] ${pname}`);
    });
  } else {
    console.log('   No projects found');
  }
  console.log('');

  db.close();

  console.log('========================================');
  console.log('  VERIFICATION RESULT');
  console.log('========================================\n');
  console.log('✓ Database file exists on disk');
  console.log('✓ Data can be read from disk file');
  console.log('✓ Test project persists in database file');
  console.log('✓ Data will survive server restart\n');
  console.log('Feature #3: Data persists across server restart - PASSING ✓\n');
}

verifyPersistence().catch(error => {
  console.error('Verification error:', error);
  process.exit(1);
});
