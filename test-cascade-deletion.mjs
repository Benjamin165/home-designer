import { getDatabase } from './backend/src/db/connection.js';

async function testCascadeDeletion() {
  const db = await getDatabase();

  console.log('\n=== Testing Cascade Deletion ===\n');

  // Check if foreign keys are enabled
  const fkCheck = db.exec('PRAGMA foreign_keys');
  console.log('Foreign keys enabled:', fkCheck[0]?.values[0][0] === 1);

  // Check for orphaned records
  console.log('\n--- Checking for orphaned records ---');

  // Check floors with project_id = 10
  const floorsResult = db.exec('SELECT * FROM floors WHERE project_id = 10');
  console.log('Floors with project_id=10:', floorsResult[0]?.values.length || 0);
  if (floorsResult[0]?.values.length > 0) {
    console.log('  Floor IDs:', floorsResult[0].values.map(r => r[0]));
  }

  // Check rooms with floor_id 3 or 4
  const roomsResult = db.exec('SELECT * FROM rooms WHERE floor_id IN (3, 4)');
  console.log('Rooms with floor_id IN (3,4):', roomsResult[0]?.values.length || 0);
  if (roomsResult[0]?.values.length > 0) {
    console.log('  Room IDs:', roomsResult[0].values.map(r => r[0]));
  }

  // Check furniture with room_id 2, 3, 4, or 5
  const furnitureResult = db.exec('SELECT * FROM furniture_placements WHERE room_id IN (2, 3, 4, 5)');
  console.log('Furniture with room_id IN (2,3,4,5):', furnitureResult[0]?.values.length || 0);
  if (furnitureResult[0]?.values.length > 0) {
    console.log('  Furniture IDs:', furnitureResult[0].values.map(r => r[0]));
  }

  // Check if project 10 exists
  const projectResult = db.exec('SELECT * FROM projects WHERE id = 10');
  console.log('Project 10 exists:', projectResult[0]?.values.length > 0 ? 'YES (BUG!)' : 'NO (correct)');

  console.log('\n=== CASCADE DELETION', (
    (floorsResult[0]?.values.length || 0) === 0 &&
    (roomsResult[0]?.values.length || 0) === 0 &&
    (furnitureResult[0]?.values.length || 0) === 0
  ) ? 'PASSED ✓' : 'FAILED ✗', '===\n');
}

testCascadeDeletion();
