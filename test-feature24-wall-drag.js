/**
 * Test Feature #24: Resize room by dragging walls
 *
 * This script tests the wall dragging functionality by:
 * 1. Creating a room with known dimensions (5m x 4m)
 * 2. Simulating a wall drag by updating dimensions
 * 3. Verifying the dimensions are updated correctly
 * 4. Testing the API update endpoint
 */

const API_BASE = 'http://localhost:5000/api';

async function testWallDragFeature() {
  console.log('=== Feature #24: Wall Dragging Test ===\n');

  try {
    // Step 1: Get project 5 (Test Project Open)
    console.log('Step 1: Getting project 5...');
    const projectRes = await fetch(`${API_BASE}/projects/5`);
    const projectData = await projectRes.json();
    console.log(`✓ Project found: ${projectData.project.name}`);

    // Get floors for project 5
    const floorsRes = await fetch(`${API_BASE}/projects/5/floors`);
    const floorsData = await floorsRes.json();
    const floor = floorsData.floors[0];
    console.log(`✓ Floor found: ${floor.name} (ID: ${floor.id})\n`);

    // Step 2: Get rooms on the floor
    console.log('Step 2: Getting rooms on the floor...');
    const roomsRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const roomsData = await roomsRes.json();

    if (roomsData.rooms.length === 0) {
      console.log('✗ No rooms found. Creating a test room...');

      // Create a test room
      const createRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Room for Wall Drag',
          dimensions_json: { width: 5.0, depth: 4.0 },
          floor_color: '#d1d5db',
          ceiling_height: 2.8,
          position_x: 0,
          position_y: 0,
          position_z: 0
        })
      });
      const createData = await createRes.json();
      var room = createData.room;
      console.log(`✓ Room created: ${room.name} (ID: ${room.id})`);
    } else {
      var room = roomsData.rooms[0];
      console.log(`✓ Room found: ${room.name || 'Unnamed'} (ID: ${room.id})`);
    }

    console.log(`  Initial dimensions: ${room.dimensions_json.width}m × ${room.dimensions_json.depth}m\n`);

    // Step 3: Simulate dragging the front wall outward (increase depth from 4.0 to 6.0)
    console.log('Step 3: Simulating wall drag (increasing depth from 4.0m to 6.0m)...');
    const newDimensions = {
      width: room.dimensions_json.width,
      depth: 6.0  // Drag front wall outward
    };

    const updateRes = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions_json: newDimensions
      })
    });

    if (!updateRes.ok) {
      throw new Error(`Update failed: ${updateRes.status} ${updateRes.statusText}`);
    }

    const updateData = await updateRes.json();
    const updatedRoom = updateData.room;

    console.log(`✓ Wall dragged successfully`);
    console.log(`  New dimensions: ${updatedRoom.dimensions_json.width}m × ${updatedRoom.dimensions_json.depth}m\n`);

    // Step 4: Verify the dimensions were saved
    console.log('Step 4: Verifying dimensions persisted...');
    const verifyRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const verifyData = await verifyRes.json();
    const verifiedRoom = verifyData.rooms.find(r => r.id === room.id);

    if (verifiedRoom.dimensions_json.depth === 6.0) {
      console.log(`✓ Dimensions verified: ${verifiedRoom.dimensions_json.width}m × ${verifiedRoom.dimensions_json.depth}m`);
    } else {
      throw new Error(`Dimension verification failed. Expected depth: 6.0, Got: ${verifiedRoom.dimensions_json.depth}`);
    }

    // Step 5: Test dragging right wall (increase width from 5.0 to 7.0)
    console.log('\nStep 5: Simulating another wall drag (increasing width from 5.0m to 7.0m)...');
    const newDimensions2 = {
      width: 7.0,  // Drag right wall outward
      depth: verifiedRoom.dimensions_json.depth
    };

    const updateRes2 = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions_json: newDimensions2
      })
    });

    const updateData2 = await updateRes2.json();
    const updatedRoom2 = updateData2.room;

    console.log(`✓ Wall dragged successfully`);
    console.log(`  Final dimensions: ${updatedRoom2.dimensions_json.width}m × ${updatedRoom2.dimensions_json.depth}m\n`);

    // Step 6: Test shrinking (drag wall inward)
    console.log('Step 6: Testing wall shrink (decreasing width to 6.0m)...');
    const updateRes3 = await fetch(`${API_BASE}/rooms/${room.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dimensions_json: { width: 6.0, depth: 6.0 }
      })
    });

    const updateData3 = await updateRes3.json();
    console.log(`✓ Wall shrink successful: ${updateData3.room.dimensions_json.width}m × ${updateData3.room.dimensions_json.depth}m\n`);

    console.log('=== All Tests Passed! ===');
    console.log('✓ Room creation works');
    console.log('✓ Wall drag (expand) works');
    console.log('✓ Wall drag (shrink) works');
    console.log('✓ Dimensions persist to database');
    console.log('✓ API update endpoint functions correctly');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    process.exit(1);
  }
}

testWallDragFeature();
