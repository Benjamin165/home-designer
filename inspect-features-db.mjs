#!/usr/bin/env node
import Database from 'better-sqlite3';

const db = new Database('.autoforge/features.db', { readonly: true });

// Get schema
console.log('Schema:');
const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='features'").get();
console.log(schema?.sql || 'No schema found');

console.log('\n' + '='.repeat(80));

// Get all columns
const columns = db.prepare("PRAGMA table_info(features)").all();
console.log('\nColumns:');
columns.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

console.log('\n' + '='.repeat(80));

// Get sample features
console.log('\nAll features:');
const features = db.prepare('SELECT * FROM features ORDER BY id').all();
console.log(`Total features: ${features.length}`);

console.log('\nFeatures 6, 7, 21:');
[6, 7, 21].forEach(id => {
  const feature = features.find(f => f.id === id);
  if (feature) {
    console.log(`\nFeature ${id}:`);
    console.log(JSON.stringify(feature, null, 2));
  }
});

db.close();
