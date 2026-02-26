#!/usr/bin/env node

/**
 * Debug Feature #88: Why isn't CASCADE DELETE working?
 */

const BASE_URL = 'http://localhost:5000';

async function debugCascadeDelete() {
  console.log('\n========================================');
  console.log('Feature #88 Debug: CASCADE DELETE Investigation');
  console.log('========================================\n');

  try {
    // Create test data
    console.log('Creating test project...');
    const projectRes = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Debug Test', description: 'Debugging CASCADE' })
    });
    const { project } = await projectRes.json();
    console.log(`✓ Project: ${project.id}`);

    const floorRes = await fetch(`${BASE_URL}/api/projects/${project.id}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 1, name: 'Floor 1', order_index: 0 })
    });
    const { floor } = await floorRes.json();
    console.log(`✓ Floor: ${floor.id}`);

    const roomRes = await fetch(`${BASE_URL}/api/floors/${floor.id}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Debug Room',
        dimensions_json: JSON.stringify({ width: 4, depth: 4 })
      })
    });
    const { room } = await roomRes.json();
    console.log(`✓ Room: ${room.id}, Name: "${room.name}"`);

    // Get an asset
    const assetsRes = await fetch(`${BASE_URL}/api/assets`);
    const { assets } = await assetsRes.json();
    const asset = assets[0];
    console.log(`✓ Asset: ${asset.id}, Name: "${asset.name}"`);

    // Place furniture
    const furnitureRes = await fetch(`${BASE_URL}/api/rooms/${room.id}/furniture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: asset.id,
        position_x: 0,
        position_y: 0,
        position_z: 0
      })
    });
    const { furniture } = await furnitureRes.json();
    console.log(`✓ Furniture placed: ID=${furniture.id}`);

    // Verify furniture exists
    console.log('\nBefore deletion:');
    const beforeRes = await fetch(`${BASE_URL}/api/rooms/${room.id}/furniture`);
    const beforeData = await beforeRes.json();
    console.log(`  Furniture count: ${beforeData.furniture.length}`);
    console.log(`  Furniture IDs: [${beforeData.furniture.map(f => f.id).join(', ')}]`);

    // Delete the room
    console.log(`\nDeleting room ${room.id}...`);
    const deleteRes = await fetch(`${BASE_URL}/api/rooms/${room.id}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteRes.json();
    console.log(`  Status: ${deleteRes.status}`);
    console.log(`  Response:`, deleteData);

    // Try to query the room again
    console.log('\nAfter deletion - querying deleted room:');
    const afterRes = await fetch(`${BASE_URL}/api/rooms/${room.id}/furniture`);
    console.log(`  Status: ${afterRes.status}`);

    if (afterRes.ok) {
      const afterData = await afterRes.json();
      console.log(`  ⚠️  Room still returns data!`);
      console.log(`  Furniture count: ${afterData.furniture ? afterData.furniture.length : 0}`);

      if (afterData.furniture && afterData.furniture.length > 0) {
        console.log(`  ❌ CASCADE DELETE FAILED - ${afterData.furniture.length} furniture items still exist!`);
        console.log(`  Furniture IDs: [${afterData.furniture.map(f => f.id).join(', ')}]`);
      } else {
        console.log(`  ✓ Furniture array is empty (CASCADE worked)`);
      }
    } else {
      const errorData = await afterRes.json();
      console.log(`  ✓ Room query failed (expected):`, errorData);
    }

    // Query all rooms to see if deleted room is gone
    console.log('\nQuerying all rooms on floor:');
    const allRoomsRes = await fetch(`${BASE_URL}/api/floors/${floor.id}/rooms`);
    const { rooms } = await allRoomsRes.json();
    console.log(`  Total rooms: ${rooms.length}`);
    const deletedRoomExists = rooms.find(r => r.id === room.id);
    if (deletedRoomExists) {
      console.log(`  ❌ Deleted room ${room.id} STILL EXISTS in floor's room list!`);
    } else {
      console.log(`  ✓ Deleted room ${room.id} no longer in floor's room list`);
    }

    // Cleanup
    await fetch(`${BASE_URL}/api/projects/${project.id}`, { method: 'DELETE' });
    console.log('\n✓ Cleanup complete\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

debugCascadeDelete();
