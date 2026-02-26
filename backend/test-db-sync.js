import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'database.db');

console.log('Checking database sync between API and disk file...\n');

// Check what's on disk
const SQL = await initSqlJs();
const buffer = readFileSync(DB_PATH);
const db = new SQL.Database(buffer);

const diskResult = db.exec('SELECT id, name FROM projects ORDER BY id');
const diskProjects = diskResult.length > 0 && diskResult[0].values.length > 0
  ? diskResult[0].values
  : [];

console.log('Projects in database FILE on disk:');
if (diskProjects.length > 0) {
  diskProjects.forEach(([id, name]) => {
    console.log(`  - ID ${id}: ${name}`);
  });
} else {
  console.log('  (none)');
}

// Check what the API returns
const apiResponse = await fetch('http://localhost:5000/api/projects');
const apiData = await apiResponse.json();

console.log('\nProjects returned by API (in-memory):');
if (apiData.projects && apiData.projects.length > 0) {
  apiData.projects.forEach(p => {
    console.log(`  - ID ${p.id}: ${p.name}`);
  });
} else {
  console.log('  (none)');
}

// Compare
console.log('\n' + '='.repeat(60));
if (diskProjects.length === apiData.projects.length) {
  console.log('✓ Disk and API are in sync');
} else {
  console.log(`❌ SYNC ISSUE: Disk has ${diskProjects.length} projects, API has ${apiData.projects.length} projects`);
  console.log('   This confirms data is not being saved to disk!');
}

db.close();
