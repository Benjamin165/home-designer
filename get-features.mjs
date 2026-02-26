#!/usr/bin/env node
import Database from 'better-sqlite3';

const db = new Database('.autoforge/features.db', { readonly: true });

const featureIds = [6, 7, 21];

for (const id of featureIds) {
  const feature = db.prepare('SELECT * FROM features WHERE id = ?').get(id);

  if (feature) {
    console.log('\n' + '='.repeat(80));
    console.log(`FEATURE ${feature.id}: ${feature.name}`);
    console.log('='.repeat(80));
    console.log(`Status: ${feature.status}`);
    console.log(`\nVerification Steps:\n${feature.verification_steps || 'No verification steps'}`);
    console.log('='.repeat(80));
  } else {
    console.log(`\nFeature ${id} not found`);
  }
}

db.close();
