// Create comprehensive test project for Feature #123
const API_BASE = 'http://localhost:5000/api';

async function createTestProject() {
  console.log('🚀 Creating comprehensive test project for Feature #123...\n');

  // 1. Create project
  console.log('1. Creating project...');
  const projectRes = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test Project',
      description: 'Full test with 2 floors, 3 rooms, 5 furniture'
    })
  });
  const { project } = await projectRes.json();
  console.log(`   ✓ Project created: ID ${project.id}\n`);

  // 2. Create 2 floors
  console.log('2. Creating 2 floors...');
  const floor1Res = await fetch(`${API_BASE}/projects/${project.id}/floors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ground Floor', level: 0, order_index: 0 })
  });
  const { floor: floor1 } = await floor1Res.json();
  console.log(`   ✓ Floor 1 created: ID ${floor1.id}`);

  const floor2Res = await fetch(`${API_BASE}/projects/${project.id}/floors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'First Floor', level: 1, order_index: 1 })
  });
  const { floor: floor2 } = await floor2Res.json();
  console.log(`   ✓ Floor 2 created: ID ${floor2.id}\n`);

  // 3. Create 3 rooms (2 on floor 1, 1 on floor 2)
  console.log('3. Creating 3 rooms...');
  const room1Res = await fetch(`${API_BASE}/floors/${floor1.id}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Living Room',
      dimensions_json: JSON.stringify({ width: 6, depth: 5, vertices: [[0,0],[6,0],[6,5],[0,5]] }),
      ceiling_height: 2.8,
      floor_material: 'hardwood',
      floor_color: '#8B4513'
    })
  });
  const { room: room1 } = await room1Res.json();
  console.log(`   ✓ Room 1 created: ID ${room1.id} (Living Room on Ground Floor)`);

  const room2Res = await fetch(`${API_BASE}/floors/${floor1.id}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kitchen',
      dimensions_json: JSON.stringify({ width: 4, depth: 3, vertices: [[0,0],[4,0],[4,3],[0,3]] }),
      ceiling_height: 2.7,
      floor_material: 'tile',
      floor_color: '#CCCCCC'
    })
  });
  const { room: room2 } = await room2Res.json();
  console.log(`   ✓ Room 2 created: ID ${room2.id} (Kitchen on Ground Floor)`);

  const room3Res = await fetch(`${API_BASE}/floors/${floor2.id}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Master Bedroom',
      dimensions_json: JSON.stringify({ width: 5, depth: 4, vertices: [[0,0],[5,0],[5,4],[0,4]] }),
      ceiling_height: 2.8,
      floor_material: 'carpet',
      floor_color: '#F5F5DC'
    })
  });
  const { room: room3 } = await room3Res.json();
  console.log(`   ✓ Room 3 created: ID ${room3.id} (Master Bedroom on First Floor)\n`);

  // 4. Get available assets
  console.log('4. Fetching available assets...');
  const assetsRes = await fetch(`${API_BASE}/assets?limit=10`);
  const { assets } = await assetsRes.json();
  console.log(`   ✓ Found ${assets.length} assets\n`);

  // 5. Place 5 furniture items across rooms
  console.log('5. Placing 5 furniture items...');
  const furnitureData = [
    { room: room1, asset: assets[0], position: [1, 0, 1], name: 'Sofa' },
    { room: room1, asset: assets[1], position: [3, 0, 2], name: 'Table' },
    { room: room2, asset: assets[2], position: [1, 0, 1], name: 'Cabinet' },
    { room: room3, asset: assets[3], position: [2, 0, 2], name: 'Bed' },
    { room: room3, asset: assets[4], position: [4, 0, 1], name: 'Chair' }
  ];

  for (const item of furnitureData) {
    const furnitureRes = await fetch(`${API_BASE}/rooms/${item.room.id}/furniture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset_id: item.asset.id,
        position_x: item.position[0],
        position_y: item.position[1],
        position_z: item.position[2],
        rotation_y: 0,
        scale_x: 1,
        scale_y: 1,
        scale_z: 1
      })
    });
    const { furniture } = await furnitureRes.json();
    console.log(`   ✓ Placed ${item.name} in ${item.room.name} (ID: ${furniture.id})`);
  }

  console.log('\n✅ Test project created successfully!');
  console.log(`\nProject ID: ${project.id}`);
  console.log(`- 2 floors (${floor1.id}, ${floor2.id})`);
  console.log(`- 3 rooms (${room1.id}, ${room2.id}, ${room3.id})`);
  console.log(`- 5 furniture items placed`);

  return project.id;
}

createTestProject().catch(console.error);
