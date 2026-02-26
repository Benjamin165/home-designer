/**
 * Feature #69: Complete room CRUD cycle works end-to-end
 *
 * This test verifies that a user can:
 * 1. Create a project (prerequisite)
 * 2. Create a room with dimensions 5m x 4m (CREATE)
 * 3. Verify the room appears and is readable (READ)
 * 4. Rename the room to 'Living Area' (UPDATE)
 * 5. Resize the room to 6m x 5m (UPDATE)
 * 6. Delete the room (DELETE)
 * 7. Verify the room is gone (READ)
 */

const API_BASE = 'http://localhost:5000/api';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyRoomCRUDCycle() {
  console.log('=== Feature #69: Complete Room CRUD Cycle Test ===\n');

  try {
    // Step 1: Create a project
    console.log('📋 Step 1: CREATE - Create a project');
    console.log('─'.repeat(50));

    const projectRes = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'CRUD Test Project',
        description: 'Testing complete room CRUD cycle'
      })
    });

    const projectData = await projectRes.json();
    const project = projectData.project;
    console.log(`✓ Project created: "${project.name}" (ID: ${project.id})`);

    // Get or create the default floor
    const floorsRes = await fetch(`${API_BASE}/projects/${project.id}/floors`);
    const floorsData = await floorsRes.json();

    let floor;
    if (floorsData.floors.length === 0) {
      console.log('  No floors found, creating default floor...');
      const createFloorRes = await fetch(`${API_BASE}/projects/${project.id}/floors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Ground Floor',
          level: 0,
          order_index: 0
        })
      });
      const createFloorData = await createFloorRes.json();
      floor = createFloorData.floor;
    } else {
      floor = floorsData.floors[0];
    }

    console.log(`✓ Floor: "${floor.name}" (ID: ${floor.id})\n`);

    // Step 2: CREATE - Create a room with dimensions 5m x 4m
    console.log('📋 Step 2: CREATE - Create a room with dimensions 5m x 4m');
    console.log('─'.repeat(50));

    const createRoomRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Room',
        dimensions_json: { width: 5.0, depth: 4.0 },
        floor_color: '#d1d5db',
        ceiling_height: 2.8,
        position_x: 0,
        position_y: 0,
        position_z: 0
      })
    });

    if (!createRoomRes.ok) {
      throw new Error(`Failed to create room: ${createRoomRes.status}`);
    }

    const createRoomData = await createRoomRes.json();
    const room = createRoomData.room;
    console.log(`✓ Room created: "${room.name}" (ID: ${room.id})`);
    console.log(`  Dimensions: ${room.dimensions_json.width}m × ${room.dimensions_json.depth}m`);
    console.log(`  Ceiling height: ${room.ceiling_height}m`);
    console.log(`  Floor color: ${room.floor_color}`);
    console.log(`✅ CREATE operation successful\n`);

    await sleep(500);

    // Step 3: READ - Verify the room appears and is readable
    console.log('📋 Step 3: READ - Verify the room appears');
    console.log('─'.repeat(50));

    const readRoomRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const readRoomData = await readRoomRes.json();

    const foundRoom = readRoomData.rooms.find(r => r.id === room.id);
    if (!foundRoom) {
      throw new Error('Room not found after creation');
    }

    console.log(`✓ Room found in database`);
    console.log(`  ID: ${foundRoom.id}`);
    console.log(`  Name: ${foundRoom.name}`);
    console.log(`  Dimensions: ${foundRoom.dimensions_json.width}m × ${foundRoom.dimensions_json.depth}m`);
    console.log(`✅ READ operation successful\n`);

    await sleep(500);

    // Step 4: UPDATE - Rename the room to 'Living Area'
    console.log('📋 Step 4: UPDATE - Rename room to "Living Area"');
    console.log('─'.repeat(50));

    const renameRes = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Living Area'
      })
    });

    if (!renameRes.ok) {
      throw new Error(`Failed to rename room: ${renameRes.status}`);
    }

    const renameData = await renameRes.json();
    console.log(`✓ Room renamed: "${renameData.room.name}"`);

    // Verify the name was updated
    const verifyNameRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const verifyNameData = await verifyNameRes.json();
    const updatedRoom = verifyNameData.rooms.find(r => r.id === room.id);

    if (updatedRoom.name !== 'Living Area') {
      throw new Error(`Name update failed: expected "Living Area", got "${updatedRoom.name}"`);
    }

    console.log(`✓ Name update verified in database`);
    console.log(`✅ UPDATE operation (rename) successful\n`);

    await sleep(500);

    // Step 5: UPDATE - Resize the room to 6m x 5m
    console.log('📋 Step 5: UPDATE - Resize room to 6m × 5m');
    console.log('─'.repeat(50));

    const resizeRes = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions_json: { width: 6.0, depth: 5.0 }
      })
    });

    if (!resizeRes.ok) {
      throw new Error(`Failed to resize room: ${resizeRes.status}`);
    }

    const resizeData = await resizeRes.json();
    console.log(`✓ Room resized: ${resizeData.room.dimensions_json.width}m × ${resizeData.room.dimensions_json.depth}m`);

    // Verify the dimensions were updated
    const verifyDimsRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const verifyDimsData = await verifyDimsRes.json();
    const resizedRoom = verifyDimsData.rooms.find(r => r.id === room.id);

    if (resizedRoom.dimensions_json.width !== 6.0 || resizedRoom.dimensions_json.depth !== 5.0) {
      throw new Error(`Dimensions update failed: expected 6.0m × 5.0m, got ${resizedRoom.dimensions_json.width}m × ${resizedRoom.dimensions_json.depth}m`);
    }

    console.log(`✓ Dimensions update verified in database`);
    console.log(`✅ UPDATE operation (resize) successful\n`);

    await sleep(500);

    // Step 6: DELETE - Delete the room
    console.log('📋 Step 6: DELETE - Delete the room');
    console.log('─'.repeat(50));

    const deleteRes = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'DELETE'
    });

    if (!deleteRes.ok) {
      throw new Error(`Failed to delete room: ${deleteRes.status}`);
    }

    console.log(`✓ Room deleted successfully`);

    // Step 7: READ - Verify the room is gone
    const verifyDeleteRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const verifyDeleteData = await verifyDeleteRes.json();
    const deletedRoom = verifyDeleteData.rooms.find(r => r.id === room.id);

    if (deletedRoom) {
      throw new Error('Room still exists after deletion');
    }

    console.log(`✓ Room no longer exists in database`);
    console.log(`✅ DELETE operation successful\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('✅ COMPLETE CRUD CYCLE SUCCESSFUL');
    console.log('='.repeat(50));
    console.log('\n📊 Operations verified:');
    console.log('  ✓ CREATE: Room created with correct dimensions');
    console.log('  ✓ READ:   Room retrieved and verified');
    console.log('  ✓ UPDATE: Room renamed successfully');
    console.log('  ✓ UPDATE: Room resized successfully');
    console.log('  ✓ DELETE: Room removed from database');
    console.log('  ✓ READ:   Confirmed room deletion');

    console.log('\n🎯 Feature #69 verification: PASSED');
    console.log('\nAll room CRUD operations work correctly end-to-end.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

verifyRoomCRUDCycle();
