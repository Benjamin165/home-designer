#!/usr/bin/env node

/**
 * Feature #42 Verification: Change wall color for individual wall
 *
 * Tests:
 * 1. Get walls for a room
 * 2. Update a single wall's color via API
 * 3. Verify the color was updated
 * 4. Verify other walls remain unchanged
 */

const BASE_URL = 'http://localhost:5000/api';

async function testFeature42() {
  console.log('🧪 Testing Feature #42: Change wall color for individual wall\n');

  try {
    // Step 1: Get the test project (ID 11)
    console.log('📋 Step 1: Getting project and room info...');
    const projectRes = await fetch(`${BASE_URL}/projects/11`);
    const project = await projectRes.json();

    if (!project.floors || project.floors.length === 0) {
      console.error('❌ No floors found in project');
      process.exit(1);
    }

    const floor = project.floors[0];
    console.log(`   ✓ Found floor: ${floor.name} (ID: ${floor.id})`);

    // Step 2: Get rooms on this floor
    const roomsRes = await fetch(`${BASE_URL}/floors/${floor.id}/rooms`);
    const roomsData = await roomsRes.json();

    if (!roomsData.rooms || roomsData.rooms.length === 0) {
      console.error('❌ No rooms found on floor');
      process.exit(1);
    }

    const room = roomsData.rooms[0];
    console.log(`   ✓ Found room: ${room.name || 'Unnamed'} (ID: ${room.id})`);

    // Step 3: Get walls for this room
    console.log('\n📋 Step 2: Getting walls for the room...');
    const wallsRes = await fetch(`${BASE_URL}/rooms/${room.id}/walls`);
    const wallsData = await wallsRes.json();

    if (!wallsData.walls || wallsData.walls.length === 0) {
      console.error('❌ No walls found in room');
      process.exit(1);
    }

    console.log(`   ✓ Found ${wallsData.walls.length} walls`);

    // Store original colors
    const originalColors = wallsData.walls.map(w => ({ id: w.id, color: w.color }));
    console.log('   Original wall colors:');
    originalColors.forEach((w, i) => {
      console.log(`     Wall ${i + 1} (ID: ${w.id}): ${w.color || 'default (#e5e7eb)'}`);
    });

    // Step 4: Update first wall's color
    const wallToUpdate = wallsData.walls[0];
    const newColor = '#3b82f6'; // Blue color

    console.log(`\n📋 Step 3: Updating wall ${wallToUpdate.id} color to ${newColor}...`);
    const updateRes = await fetch(`${BASE_URL}/walls/${wallToUpdate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: newColor })
    });

    if (!updateRes.ok) {
      console.error('❌ Failed to update wall color');
      process.exit(1);
    }

    const updateData = await updateRes.json();
    console.log(`   ✓ Wall color updated successfully`);

    // Step 5: Verify the color was updated
    console.log('\n📋 Step 4: Verifying color change...');
    const verifyRes = await fetch(`${BASE_URL}/rooms/${room.id}/walls`);
    const verifyData = await verifyRes.json();

    const updatedWall = verifyData.walls.find(w => w.id === wallToUpdate.id);

    if (updatedWall.color !== newColor) {
      console.error(`❌ Wall color not updated correctly. Expected: ${newColor}, Got: ${updatedWall.color}`);
      process.exit(1);
    }

    console.log(`   ✓ Wall ${wallToUpdate.id} color verified: ${updatedWall.color}`);

    // Step 6: Verify other walls remain unchanged
    console.log('\n📋 Step 5: Verifying other walls unchanged...');
    let allOthersUnchanged = true;

    for (let i = 1; i < wallsData.walls.length; i++) {
      const originalWall = originalColors[i];
      const currentWall = verifyData.walls.find(w => w.id === originalWall.id);

      if (currentWall.color !== originalWall.color) {
        console.error(`❌ Wall ${originalWall.id} color changed unexpectedly!`);
        allOthersUnchanged = false;
      }
    }

    if (allOthersUnchanged) {
      console.log(`   ✓ Other ${wallsData.walls.length - 1} walls remain unchanged`);
    }

    // Step 7: Test another color change
    console.log(`\n📋 Step 6: Testing second wall color change...`);
    if (wallsData.walls.length > 1) {
      const secondWall = wallsData.walls[1];
      const secondColor = '#ef4444'; // Red color

      const update2Res = await fetch(`${BASE_URL}/walls/${secondWall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: secondColor })
      });

      if (!update2Res.ok) {
        console.error('❌ Failed to update second wall color');
        process.exit(1);
      }

      // Verify
      const verify2Res = await fetch(`${BASE_URL}/rooms/${room.id}/walls`);
      const verify2Data = await verify2Res.json();

      const wall1 = verify2Data.walls.find(w => w.id === wallToUpdate.id);
      const wall2 = verify2Data.walls.find(w => w.id === secondWall.id);

      if (wall1.color === newColor && wall2.color === secondColor) {
        console.log(`   ✓ Both walls have different colors:`);
        console.log(`     Wall ${wallToUpdate.id}: ${wall1.color}`);
        console.log(`     Wall ${secondWall.id}: ${wall2.color}`);
      } else {
        console.error('❌ Wall colors not correct after second update');
        process.exit(1);
      }
    }

    console.log('\n✅ Feature #42 VERIFIED: Individual wall color change works correctly!');
    console.log('\nImplementation confirmed:');
    console.log('  ✓ Wall color API endpoint works (PUT /api/walls/:id)');
    console.log('  ✓ Individual walls can be updated independently');
    console.log('  ✓ Color changes persist in database');
    console.log('  ✓ Other walls remain unchanged');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

testFeature42();
