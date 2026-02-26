#!/usr/bin/env node

/**
 * Check if foreign keys are enabled and CASCADE is configured
 */

import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'backend/database.db');

async function checkForeignKeys() {
  console.log('\n========================================');
  console.log('Foreign Keys Check');
  console.log('========================================\n');

  const SQL = await initSqlJs();
  const buffer = readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Check if foreign keys are enabled
  console.log('1. Checking PRAGMA foreign_keys...');
  const fkResult = db.exec('PRAGMA foreign_keys');
  const fkEnabled = fkResult.length > 0 && fkResult[0].values[0][0] === 1;
  console.log(`   Foreign keys enabled: ${fkEnabled ? '✓ YES' : '❌ NO'}`);

  if (!fkEnabled) {
    console.log('\n   ⚠️  Enabling foreign keys for this session...');
    db.exec('PRAGMA foreign_keys = ON');
    const recheckResult = db.exec('PRAGMA foreign_keys');
    const recheckEnabled = recheckResult.length > 0 && recheckResult[0].values[0][0] === 1;
    console.log(`   After enable: ${recheckEnabled ? '✓ YES' : '❌ NO'}`);
  }

  // Check furniture_placements table schema
  console.log('\n2. Checking furniture_placements table schema...');
  const schemaResult = db.exec('SELECT sql FROM sqlite_master WHERE type="table" AND name="furniture_placements"');

  if (schemaResult.length > 0 && schemaResult[0].values.length > 0) {
    const schema = schemaResult[0].values[0][0];
    console.log('\n   Table definition:');
    console.log('   ' + schema.split('\n').join('\n   '));

    if (schema.includes('ON DELETE CASCADE')) {
      console.log('\n   ✓ CASCADE DELETE is configured in schema');
    } else {
      console.log('\n   ❌ CASCADE DELETE is NOT in schema!');
    }
  }

  // Check foreign key list for furniture_placements
  console.log('\n3. Checking foreign key constraints...');
  const fkListResult = db.exec('PRAGMA foreign_key_list(furniture_placements)');

  if (fkListResult.length > 0 && fkListResult[0].values.length > 0) {
    console.log('   Foreign keys on furniture_placements:');
    const columns = fkListResult[0].columns;
    fkListResult[0].values.forEach((row, idx) => {
      const fk = {};
      columns.forEach((col, colIdx) => {
        fk[col] = row[colIdx];
      });
      console.log(`\n   FK #${idx + 1}:`);
      console.log(`     from: ${fk.from} -> ${fk.table}.${fk.to}`);
      console.log(`     on_delete: ${fk.on_delete}`);
      console.log(`     on_update: ${fk.on_update}`);
    });
  } else {
    console.log('   ❌ No foreign keys found!');
  }

  db.close();
  console.log('\n========================================\n');
}

checkForeignKeys();
