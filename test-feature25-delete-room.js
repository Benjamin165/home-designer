/**
 * Test Feature #25: Delete room with furniture warning dialog
 *
 * This script tests the delete room functionality with furniture warning
 */

const API_BASE = 'http://localhost:5000/api';

async function testDeleteRoomFeature() {
  console.log('=== Feature #25: Delete Room with Furniture Warning ===\n');

  try {
    // Step 1: Get project 5 and its floor
    console.log('Step 1: Getting project and floor...');
    const floorsRes = await fetch(`${API_BASE}/projects/5/floors`);
    const floorsData = await floorsRes.json();
    const floor = floorsData.floors[0];
    console.log(`✓ Floor found: ${floor.name} (ID: ${floor.id})`);

    // Step 2: Get or create a room
    console.log('\nStep 2: Getting room...');
    const roomsRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`);
    const roomsData = await roomsRes.json();

    let room;
    if (roomsData.rooms.length === 0) {
      console.log('No rooms found, creating one...');
      const createRes = await fetch(`${API_BASE}/floors/${floor.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Room for Delete',
          dimensions_json: { width: 4.0, depth: 4.0 },
          floor_color: '#d1d5db',
          ceiling_height: 2.8,
          position_x: 0,
          position_y: 0,
          position_z: 0
        })
      });
      const createData = await createRes.json();
      room = createData.room;
    } else {
      room = roomsData.rooms[0];
    }
    console.log(`✓ Room: ${room.name || 'Unnamed'} (ID: ${room.id})`);

    // Step 3: Check for assets
    console.log('\nStep 3: Checking for assets...');
    const assetsRes = await fetch(`${API_BASE}/assets?limit=1`);
    const assetsData = await assetsRes.json();

    if (assetsData.assets.length === 0) {
      console.log('⚠️  No assets found in database. Skipping furniture placement.');
      console.log('   (Feature can still be tested with empty room)\n');
    } else {
      const asset = assetsData.assets[0];
      console.log(`✓ Asset found: ${asset.name} (ID: ${asset.id})`);

      // Step 4: Check if room already has furniture
      console.log('\nStep 4: Checking for furniture in room...');
      const furnitureRes = await fetch(`${API_BASE}/rooms/${room.id}/furniture`);
      const furnitureData = await furnitureRes.json();

      console.log(`  Current furniture count: ${furnitureData.furniture.length}`);

      if (furnitureData.furniture.length === 0) {
        console.log('  Placing furniture...');
        const placeRes = await fetch(`${API_BASE}/rooms/${room.id}/furniture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asset_id: asset.id,
            position_x: 0,
            position_y: 0,
            position_z: 0,
            rotation_x: 0,
            rotation_y: 0,
            rotation_z: 0,
            scale_x: 1,
            scale_y: 1,
            scale_z: 1
          })
        });
        const placeData = await placeRes.json();
        console.log(`✓ Furniture placed: ${placeData.furniture.id}`);
      }
    }

    console.log('\n=== Setup Complete ===');
    console.log('✓ Room created/exists with ID:', room.id);
    console.log('✓ Check room for furniture via API');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:5173/editor/5 in browser');
    console.log('2. Switch to Select tool (first toolbar button)');
    console.log('3. Click on the room to select it');
    console.log('4. In Properties Panel, click "Delete Room" button');
    console.log('5. Verify warning dialog appears');
    console.log('6. Test "Cancel" button');
    console.log('7. Test "Delete Room & Furniture" button');
    console.log('8. If furniture exists, test "Delete Room, Keep Furniture in Space" button');

  } catch (error) {
    console.error('\n✗ Test setup failed:', error.message);
    process.exit(1);
  }
}

testDeleteRoomFeature();
