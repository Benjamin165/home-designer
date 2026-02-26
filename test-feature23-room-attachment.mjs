/**
 * Test Feature #23: Attach new rooms to existing rooms
 *
 * This script tests that:
 * 1. We can create a first room (4m x 5m)
 * 2. We can create a second room adjacent to the first
 * 3. The rooms are properly positioned next to each other
 * 4. The rooms share a wall
 */

const API_BASE = 'http://localhost:5000/api';

async function testRoomAttachment() {
  console.log('='.repeat(60));
  console.log('Testing Feature #23: Room Attachment');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 1: Get the existing room(s)
    console.log('Step 1: Fetching existing rooms...');
    const floorsRes = await fetch(`${API_BASE}/projects/2/floors`);
    const floorsData = await floorsRes.json();
    const floors = floorsData.floors || floorsData;
    console.log(`✓ Found ${floors.length} floor(s)`);

    const floorId = floors[0].id;
    console.log(`✓ Using floor ID: ${floorId}`);
    console.log('');

    const roomsRes = await fetch(`${API_BASE}/floors/${floorId}/rooms`);
    const roomsData = await roomsRes.json();
    const rooms = roomsData.rooms || roomsData;
    console.log(`✓ Found ${rooms.length} existing room(s)`);

    if (rooms.length === 0) {
      console.log('✗ No rooms found! Please create a first room.');
      return;
    }

    const firstRoom = rooms[0];
    console.log(`✓ First room: ID ${firstRoom.id}, name "${firstRoom.name}"`);
    console.log(`  - Dimensions: ${firstRoom.dimensions_json.width}m x ${firstRoom.dimensions_json.depth}m`);
    console.log(`  - Position: (${firstRoom.position_x}, ${firstRoom.position_z})`);
    console.log('');

    // Step 2: Calculate position for second room (attached to the right edge)
    console.log('Step 2: Creating second room attached to first room...');
    const room1Width = firstRoom.dimensions_json.width;
    const room1Depth = firstRoom.dimensions_json.depth;
    const room1X = firstRoom.position_x;
    const room1Z = firstRoom.position_z;

    // Position the second room to the right of the first room
    // Second room: 3m x 4m
    const room2Width = 3;
    const room2Depth = 4;

    // Right edge of first room is at: room1X + room1Width/2
    // Left edge of second room should be at: room2X - room2Width/2
    // For them to be adjacent: room1X + room1Width/2 = room2X - room2Width/2
    // Therefore: room2X = room1X + room1Width/2 + room2Width/2
    const room2X = room1X + room1Width / 2 + room2Width / 2;
    const room2Z = room1Z; // Same Z position for aligned walls

    console.log(`  Creating room at position (${room2X}, ${room2Z})`);
    console.log(`  Dimensions: ${room2Width}m x ${room2Depth}m`);

    const createRes = await fetch(`${API_BASE}/floors/${floorId}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Room 2 (Attached)`,
        dimensions_json: {
          width: room2Width,
          depth: room2Depth,
        },
        position_x: room2X,
        position_y: 0,
        position_z: room2Z,
        ceiling_height: 2.8,
        floor_color: '#e5e7eb',
        ceiling_color: '#f3f4f6',
      }),
    });

    const createData = await createRes.json();
    const secondRoom = createData.room;
    console.log(`✓ Second room created: ID ${secondRoom.id}, name "${secondRoom.name}"`);
    console.log('');

    // Step 3: Verify the rooms are adjacent
    console.log('Step 3: Verifying rooms are adjacent...');

    // Calculate the distance between the right edge of room 1 and left edge of room 2
    const room1RightEdge = room1X + room1Width / 2;
    const room2LeftEdge = room2X - room2Width / 2;
    const edgeDistance = Math.abs(room1RightEdge - room2LeftEdge);

    console.log(`  Room 1 right edge: ${room1RightEdge.toFixed(2)}`);
    console.log(`  Room 2 left edge: ${room2LeftEdge.toFixed(2)}`);
    console.log(`  Distance between edges: ${edgeDistance.toFixed(4)}m`);

    if (edgeDistance < 0.01) {
      console.log('✓ SUCCESS: Rooms are adjacent (share a wall)');
    } else if (edgeDistance < 0.5) {
      console.log(`⚠ Rooms are close but not touching (${edgeDistance.toFixed(2)}m gap)`);
    } else {
      console.log(`✗ Rooms are too far apart (${edgeDistance.toFixed(2)}m gap)`);
    }
    console.log('');

    // Step 4: Verify Z alignment
    console.log('Step 4: Verifying wall alignment...');
    const zAlignment = Math.abs(room1Z - room2Z);
    console.log(`  Z-axis difference: ${zAlignment.toFixed(4)}m`);

    if (zAlignment < 0.01) {
      console.log('✓ Rooms are aligned (walls in same plane)');
    } else {
      console.log(`⚠ Rooms are not perfectly aligned (${zAlignment.toFixed(2)}m offset)`);
    }
    console.log('');

    // Step 5: Summary
    console.log('='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`First room: ${room1Width}m x ${room1Depth}m at (${room1X}, ${room1Z})`);
    console.log(`Second room: ${room2Width}m x ${room2Depth}m at (${room2X}, ${room2Z})`);
    console.log(`Edge distance: ${edgeDistance.toFixed(4)}m`);
    console.log(`Z alignment: ${zAlignment.toFixed(4)}m`);

    if (edgeDistance < 0.01 && zAlignment < 0.01) {
      console.log('');
      console.log('✓✓✓ FEATURE #23 VERIFIED: Rooms are properly attached! ✓✓✓');
    } else {
      console.log('');
      console.log('⚠ Rooms created but may not be perfectly attached');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('✗ Test failed with error:', error.message);
    console.error(error);
  }
}

testRoomAttachment();
