import { getDatabase, saveDatabase } from './backend/src/db/connection.js';

async function testManualDelete() {
  const db = await getDatabase();

  console.log('\n=== Testing Manual CASCADE Deletion ===\n');

  // Before deletion
  console.log('BEFORE deletion:');
  const beforeFloors = db.exec('SELECT COUNT(*) FROM floors WHERE project_id = 10');
  console.log('  Floors:', beforeFloors[0]?.values[0][0]);

  // Try using db.exec() instead of db.run()
  console.log('\nDeleting project 10 using db.exec()...');
  try {
    db.exec('DELETE FROM projects WHERE id = 10');
    console.log('✓ Delete executed');
  } catch (err) {
    console.log('✗ Delete failed:', err.message);
  }

  // After deletion
  console.log('\nAFTER deletion:');
  const afterProject = db.exec('SELECT COUNT(*) FROM projects WHERE id = 10');
  console.log('  Project 10:', afterProject[0]?.values[0][0]);

  const afterFloors = db.exec('SELECT COUNT(*) FROM floors WHERE project_id = 10');
  console.log('  Floors with project_id=10:', afterFloors[0]?.values[0][0]);

  const afterRooms = db.exec('SELECT COUNT(*) FROM rooms WHERE floor_id IN (3, 4)');
  console.log('  Rooms with floor_id IN (3,4):', afterRooms[0]?.values[0][0]);

  saveDatabase();
  console.log('\n✓ Database saved');

  const cascadeWorked = afterFloors[0]?.values[0][0] === 0 && afterRooms[0]?.values[0][0] === 0;
  console.log('\n=== CASCADE', cascadeWorked ? 'WORKED ✓' : 'FAILED ✗', '===\n');

  process.exit(0);
}

testManualDelete();
