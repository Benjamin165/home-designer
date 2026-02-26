import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SQL = await initSqlJs();
const buffer = readFileSync(join('backend', 'database.db'));
const db = new SQL.Database(buffer);

console.log('Checking room data in disk database...\n');

const result = db.exec(`
  SELECT id, floor_id, name, dimensions_json, ceiling_height
  FROM rooms
  WHERE name = 'Test Room'
`);

if (result.length > 0 && result[0].values.length > 0) {
  const [id, floor_id, name, dimensions_json, ceiling_height] = result[0].values[0];
  console.log('✓ Test Room found in database file:');
  console.log(`  ID: ${id}`);
  console.log(`  Floor ID: ${floor_id}`);
  console.log(`  Name: ${name}`);
  console.log(`  Dimensions: ${dimensions_json}`);
  console.log(`  Ceiling Height: ${ceiling_height}m`);

  const dims = JSON.parse(dimensions_json);
  console.log(`\n✓ Parsed dimensions:`);
  console.log(`  Width: ${dims.width}m`);
  console.log(`  Depth: ${dims.depth}m`);

  if (dims.width === 6.5 && dims.depth === 4.2) {
    console.log('\n✓✓✓ VERIFIED: Room dimensions are 6.5m x 4.2m and persisted to disk!');
  } else {
    console.log('\n✗ ERROR: Dimensions do not match expected values');
  }
} else {
  console.log('✗ Test Room not found in database file');
  process.exit(1);
}

db.close();
