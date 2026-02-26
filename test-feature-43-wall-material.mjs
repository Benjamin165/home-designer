#!/usr/bin/env node

/**
 * Feature #43 Test: Apply wall texture to individual wall
 * Tests wall material/texture selection for individual walls
 */

const BASE_URL = 'http://localhost:5000/api';

async function testFeature43() {
  console.log('🧪 Testing Feature #43: Apply wall texture to individual wall\n');

  try {
    // Step 1: Create test project
    console.log('📋 Step 1: Creating test project...');
    const projectRes = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Feature 43 Test',
        description: 'Testing wall material/texture'
      })
    });
    const projectData = await projectRes.json();
    const projectId = projectData.project.id;
    console.log(`   ✓ Created project ID: ${projectId}`);

    // Step 2: Create floor
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

    // Step 3: Create room
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

    // Step 4: Get walls
    console.log('\n📋 Step 4: Getting walls for the room...');
    const wallsRes = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
    const wallsData = await wallsRes.json();

    if (!wallsData.walls || wallsData.walls.length === 0) {
      console.error('❌ No walls found');
      process.exit(1);
    }

    console.log(`   ✓ Found ${wallsData.walls.length} walls`);
    console.log('   Initial wall materials:');
    wallsData.walls.forEach((w, i) => {
      console.log(`     Wall ${i + 1} (ID: ${w.id}): material=${w.material || 'paint (default)'}`);
    });

    // Step 5: Update first wall to brick
    const wall1 = wallsData.walls[0];
    console.log(`\n📋 Step 5: Changing wall ${wall1.id} material to 'brick'...`);

    const update1Res = await fetch(`${BASE_URL}/walls/${wall1.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: 'brick' })
    });

    if (!update1Res.ok) {
      console.error('❌ Failed to update wall material');
      process.exit(1);
    }

    console.log(`   ✓ Wall ${wall1.id} material updated to brick`);

    // Step 6: Verify the material change
    console.log('\n📋 Step 6: Verifying wall material change...');
    const verify1Res = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
    const verify1Data = await verify1Res.json();

    const updatedWall1 = verify1Data.walls.find(w => w.id === wall1.id);

    if (updatedWall1.material !== 'brick') {
      console.error(`❌ Material not updated. Expected: brick, Got: ${updatedWall1.material}`);
      process.exit(1);
    }

    console.log(`   ✓ Wall ${wall1.id} material verified: ${updatedWall1.material}`);

    // Step 7: Verify other walls unchanged
    console.log('\n📋 Step 7: Verifying other walls remain unchanged...');
    const otherWalls = verify1Data.walls.filter(w => w.id !== wall1.id);
    const allUnchanged = otherWalls.every(w => w.material === null || w.material === 'paint');

    if (!allUnchanged) {
      console.error('❌ Other walls changed unexpectedly!');
      process.exit(1);
    }

    console.log(`   ✓ Other ${otherWalls.length} walls remain at default material`);

    // Step 8: Test multiple different materials
    if (wallsData.walls.length >= 4) {
      console.log('\n📋 Step 8: Applying different materials to different walls...');

      const materials = [
        { wall: wallsData.walls[1], material: 'wood_panel' },
        { wall: wallsData.walls[2], material: 'tile' },
        { wall: wallsData.walls[3], material: 'concrete' }
      ];

      for (const { wall, material } of materials) {
        await fetch(`${BASE_URL}/walls/${wall.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ material })
        });
        console.log(`   ✓ Wall ${wall.id} → ${material}`);
      }

      // Verify all materials
      console.log('\n📋 Step 9: Verifying all wall materials...');
      const verifyFinalRes = await fetch(`${BASE_URL}/rooms/${roomId}/walls`);
      const verifyFinalData = await verifyFinalRes.json();

      console.log('   Final wall materials:');
      const expectedMaterials = [
        { id: wallsData.walls[0].id, material: 'brick' },
        { id: wallsData.walls[1].id, material: 'wood_panel' },
        { id: wallsData.walls[2].id, material: 'tile' },
        { id: wallsData.walls[3].id, material: 'concrete' }
      ];

      let allCorrect = true;
      for (const expected of expectedMaterials) {
        const wall = verifyFinalData.walls.find(w => w.id === expected.id);
        const isCorrect = wall.material === expected.material;
        console.log(`     Wall ${expected.id}: ${wall.material} ${isCorrect ? '✓' : '❌'}`);
        if (!isCorrect) allCorrect = false;
      }

      if (!allCorrect) {
        console.error('❌ Not all materials were applied correctly');
        process.exit(1);
      }

      console.log('   ✓ All walls have correct materials!');
    }

    // Step 10: Cleanup
    console.log('\n📋 Step 10: Cleaning up test project...');
    await fetch(`${BASE_URL}/projects/${projectId}`, { method: 'DELETE' });
    console.log(`   ✓ Test project deleted`);

    console.log('\n✅ Feature #43 PASSED: Individual wall material/texture application works!');
    console.log('\n📊 Test Summary:');
    console.log('   ✓ Wall material API endpoint functional (PUT /api/walls/:id)');
    console.log('   ✓ Individual walls can have different materials');
    console.log('   ✓ Material changes persist in database');
    console.log('   ✓ Multiple material types supported (brick, wood_panel, tile, concrete)');
    console.log('   ✓ Other walls remain unaffected by material changes');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testFeature43();
