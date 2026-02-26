import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SQL = await initSqlJs();
const buffer = readFileSync(join('backend', 'database.db'));
const db = new SQL.Database(buffer);

console.log('Projects in disk database:');
const result = db.exec('SELECT id, name FROM projects ORDER BY id');

if (result.length > 0 && result[0].values.length > 0) {
  result[0].values.forEach(([id, name]) => {
    console.log(`  [${id}] ${name}`);
  });
  console.log(`\nTotal: ${result[0].values.length} projects`);
} else {
  console.log('  No projects found');
}

db.close();
