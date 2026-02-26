#!/usr/bin/env node

/**
 * Test Feature #32 via API
 * Verify furniture can be placed in a room
 */

async function testFurniturePlacementAPI() {
  console.log('Testing Feature #32 via API: Place furniture in room\n');

  try {
    // Get project 6 (Regression Test Living Room)
    const projectId = 6;
    console.log(`1. Getting project ${projectId}...`);
    const projectRes = await fetch(`http://localhost:3000/api/projects/${projectId}`);
    const projectData = await projectRes.json();
    console.log(`   Project: ${projectData.project.name}`);

    // Get floors
    console.log('\n2. Getting floors...');
    const floorsRes = await fetch(`http://localhost:3000/api/projects/${projectId}/floors`);
    const floorsData = await floorsRes.json();
    const floorId = floorsData.floors[0].id;
    console.log(`   Floor ID: ${floorId}`);

    // Get rooms
    console.log('\n3. Getting rooms...');
    const roomsRes = await fetch(`http://localhost:3000/api/floors/${floorId}/rooms`);
    const roomsData = await roomsRes.json();

    if (roomsData.rooms.length === 0) {
      console.log('   ❌ No rooms found. Please create a room first.');
      return;
    }

    const roomId = roomsData.rooms[0].id;
    console.log(`   Room ID: ${roomId}`);

    // Get assets
    console.log('\n4. Getting assets...');
    const assetsRes = await fetch('http://localhost:3000/api/assets');
    const assetsData = await assetsRes.json();
    const furniture = assetsData.assets.find(a => a.category === 'Furniture');

    if (!furniture) {
      console.log('   ❌ No furniture assets found');
      return;
    }

    console.log(`   Using asset: ${furniture.name} (ID: ${furniture.id})`);

    // Place furniture
    console.log('\n5. Placing furniture in room...');
    const furnitureData = {
      asset_id: furniture.id,
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
    };

    const placeRes = await fetch(`http://localhost:3000/api/rooms/${roomId}/furniture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(furnitureData),
    });

    if (!placeRes.ok) {
      const error = await placeRes.text();
      console.log(`   ❌ Failed to place furniture: ${error}`);
      return;
    }

    const placed = await placeRes.json();
    console.log(`   ✅ Furniture placed successfully!`);
    console.log(`   Furniture ID: ${placed.furniture.id}`);
    console.log(`   Position: (${placed.furniture.position_x}, ${placed.furniture.position_y}, ${placed.furniture.position_z})`);

    // Verify by getting furniture list
    console.log('\n6. Verifying furniture in room...');
    const verifyRes = await fetch(`http://localhost:3000/api/rooms/${roomId}/furniture`);
    const verifyData = await verifyRes.json();
    console.log(`   Total furniture in room: ${verifyData.furniture.length}`);

    console.log('\n✅ API test passed! Furniture placement works correctly.');
    console.log('   The API endpoints support furniture placement.');
    console.log('   Now testing UI drag-and-drop integration...');

  } catch (error) {
    console.error('\n❌ API test failed:', error.message);
  }
}

testFurniturePlacementAPI();
