#!/usr/bin/env node

/**
 * Feature #42 Complete Test: Change wall color for individual wall
 * Creates a fresh project, floor, and room, then tests wall color changes
 */

const BASE_URL = 'http://localhost:5000/api';

async function testFeature42Complete() {
  console.log('🧪 Testing Feature #42: Change wall color for individual wall\n');

  try {
    // Step 1: Create a test project
    console.log('📋 Step 1: Creating test project...');
    const projectRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Feature 42 Test',
        description: 'Testing wall color changes'
      })
    });
    const projectData = await projectRes.json();
    const projectId = projectData.project.id;
    console.log(`   ✓ Created project ID: ${projectId}`);

    // Step 2: Create a floor
    console.log('\n📋 Step 2: Creating floor...');
    const floorRes = await fetch(`${BASE_URL}/projects/${projectId}/floors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ground Floor',
        level: 0,
        order_index: 0
      })
    });
    const floorData = await floorRes.json();
    const floorId = floorData.floor.id;
    console.log(`   ✓ Created floor ID: ${floorId}`);

    // Step 3: Create a room (5m x 4m)
    console.log('\n📋 Step 3: Creating room with walls...');
    const roomRes = await fetch(`${BASE_URL}/floors/${floorId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Room',
        dimensions_json: {
          width: 5.0,
          depth: 4.0,
          vertices: []
        },
        position_x: 0,
        position_y: 0,
        position_z: 0,
        ceiling_height: 2.8
      })
    });
    const roomData = await roomRes.json();
    const roomId = roomData.room.id;
    console.log(`   ✓ Created room ID: ${roomId}`);

    // Step 4: Get walls for this room
    console.log('\n📋 Step 4: Getting walls for the room...');
    const wallsRes = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
    const wallsData = await wallsRes.json();

    if (!wallsData.walls || wallsData.walls.length === 0) {
      console.error('❌ No walls found - walls should be auto-created with room');
      process.exit(1);
    }

    console.log(`   ✓ Found ${wallsData.walls.length} walls`);
    wallsData.walls.forEach((w, i) => {
      console.log(`     Wall ${i + 1} (ID: ${w.id}): color=${w.color || 'default (#e5e7eb)'}`);
    });

    // Step 5: Update first wall's color to blue
    const wall1 = wallsData.walls[0];
    const blueColor = '#3b82f6';

    console.log(`\n📋 Step 5: Changing wall ${wall1.id} to blue (${blueColor})...`);
    const update1Res = await fetch(`${BASE_URL}/walls/${wall1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color: blueColor })
    });

    if (!update1Res.ok) {
      const error = await update1Res.text();
      console.error('❌ Failed to update wall color:', error);
      process.exit(1);
    }

    console.log(`   ✓ Wall ${wall1.id} updated to ${blueColor}`);

    // Step 6: Verify the color change
    console.log('\n📋 Step 6: Verifying wall color change...');
    const verify1Res = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
    const verify1Data = await verify1Res.json();

    const updatedWall1 = verify1Data.walls.find(w => w.id === wall1.id);

    if (updatedWall1.color !== blueColor) {
      console.error(`❌ Color verification failed. Expected: ${blueColor}, Got: ${updatedWall1.color}`);
      process.exit(1);
    }

    console.log(`   ✓ Wall ${wall1.id} color verified: ${updatedWall1.color}`);

    // Step 7: Verify other walls unchanged
    console.log('\n📋 Step 7: Verifying other walls remain unchanged...');
    const otherWalls = verify1Data.walls.filter(w => w.id !== wall1.id);
    const allUnchanged = otherWalls.every(w => w.color === null || w.color === '#e5e7eb');

    if (!allUnchanged) {
      console.error('❌ Other walls changed unexpectedly!');
      process.exit(1);
    }

    console.log(`   ✓ Other ${otherWalls.length} walls remain at default color`);

    // Step 8: Update second wall to red
    if (wallsData.walls.length > 1) {
      const wall2 = wallsData.walls[1];
      const redColor = '#ef4444';

      console.log(`\n📋 Step 8: Changing wall ${wall2.id} to red (${redColor})...`);
      const update2Res = await fetch(`${BASE_URL}/walls/${wall2.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: redColor })
      });

      if (!update2Res.ok) {
        console.error('❌ Failed to update second wall');
        process.exit(1);
      }

      console.log(`   ✓ Wall ${wall2.id} updated to ${redColor}`);

      // Step 9: Verify both walls have different colors
      console.log('\n📋 Step 9: Verifying multiple walls with different colors...');
      const verify2Res = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
      const verify2Data = await verify2Res.json();

      const finalWall1 = verify2Data.walls.find(w => w.id === wall1.id);
      const finalWall2 = verify2Data.walls.find(w => w.id === wall2.id);

      if (finalWall1.color !== blueColor) {
        console.error(`❌ Wall 1 color changed! Expected: ${blueColor}, Got: ${finalWall1.color}`);
        process.exit(1);
      }

      if (finalWall2.color !== redColor) {
        console.error(`❌ Wall 2 color incorrect! Expected: ${redColor}, Got: ${finalWall2.color}`);
        process.exit(1);
      }

      console.log(`   ✓ Multiple walls verified:`);
      console.log(`     Wall ${wall1.id}: ${finalWall1.color} (blue)`);
      console.log(`     Wall ${wall2.id}: ${finalWall2.color} (red)`);

      const otherWalls2 = verify2Data.walls.filter(w => w.id !== wall1.id && w.id !== wall2.id);
      console.log(`     Other ${otherWalls2.length} walls: default color`);
    }

    // Step 10: Cleanup
    console.log('\n📋 Step 10: Cleaning up test project...');
    await fetch(`${BASE_URL}/projects/${projectId}`, { method: 'DELETE' });
    console.log(`   ✓ Test project deleted`);

    console.log('\n✅ Feature #42 PASSED: Individual wall color changes work correctly!');
    console.log('\n📊 Test Summary:');
    console.log('   ✓ Wall color API endpoint functional (PUT /api/walls/:id)');
    console.log('   ✓ Individual walls can be colored independently');
    console.log('   ✓ Color changes persist in database');
    console.log('   ✓ Other walls remain unaffected');
    console.log('   ✓ Multiple walls can have different colors simultaneously');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFeature42Complete();
