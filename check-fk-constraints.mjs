import { getDatabase } from './backend/src/db/connection.js';

async function checkConstraints() {
  const db = await getDatabase();

  console.log('\n=== Checking Foreign Key Constraints ===\n');

  // Get table schema for floors
  const floorsSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='floors'");
  console.log('Floors table schema:');
  console.log(floorsSchema[0]?.values[0][0] || 'NOT FOUND');
  console.log('');

  // Get table schema for rooms
  const roomsSchema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='rooms'");
  console.log('Rooms table schema:');
  console.log(roomsSchema[0]?.values[0][0] || 'NOT FOUND');
  console.log('');

  // Get foreign key list for floors
  const floorsFk = db.exec("PRAGMA foreign_key_list(floors)");
  console.log('Floors foreign keys:');
  if (floorsFk[0]?.values.length > 0) {
    console.log(JSON.stringify(floorsFk[0], null, 2));
  } else {
    console.log('NONE FOUND!');
  }
  console.log('');

  process.exit(0);
}

checkConstraints();
