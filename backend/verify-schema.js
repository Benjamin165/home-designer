import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'database.db');

console.log('Verifying database schema...\n');

// Expected tables based on Feature 2 requirements
const REQUIRED_TABLES = [
  'projects',
  'floors',
  'rooms',
  'walls',
  'assets',
  'asset_tags',
  'furniture_placements',
  'lights',
  'windows',
  'doors',
  'edit_history',
  'ai_generations',
  'user_settings',
  'material_presets'
];

// Load database from disk
const SQL = await initSqlJs();
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

// Query sqlite_master to get all tables
const result = db.exec(`
  SELECT name, type
  FROM sqlite_master
  WHERE type='table' AND name NOT LIKE 'sqlite_%'
  ORDER BY name
`);

const actualTables = result.length > 0 && result[0].values.length > 0
  ? result[0].values.map(([name]) => name)
  : [];

console.log('Tables found in database:');
actualTables.forEach(table => {
  console.log(`  ✓ ${table}`);
});

console.log('\n' + '='.repeat(60));
console.log('Verification Results:\n');

// Check each required table
let allPresent = true;
REQUIRED_TABLES.forEach(table => {
  if (actualTables.includes(table)) {
    console.log(`✓ ${table} - PRESENT`);
  } else {
    console.log(`❌ ${table} - MISSING`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(60));
if (allPresent) {
  console.log('✅ ALL REQUIRED TABLES PRESENT');
} else {
  console.log('❌ SOME TABLES ARE MISSING');
}

// Check foreign keys are enabled
const fkResult = db.exec('PRAGMA foreign_keys');
const fkEnabled = fkResult.length > 0 && fkResult[0].values[0][0] === 1;
console.log(`\nForeign keys: ${fkEnabled ? '✓ ENABLED' : '❌ DISABLED'}`);

db.close();
