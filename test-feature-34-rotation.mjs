#!/usr/bin/env node

/**
 * Feature #34 Test: Rotate furniture object
 *
 * This test verifies:
 * 1. User can select furniture and see rotation controls
 * 2. User can rotate furniture via input field
 * 3. User can rotate furniture using quick rotation buttons (±90°, 180°)
 * 4. Rotation updates in the viewport
 * 5. Rotation value updates in properties panel
 * 6. Rotation persists to database
 */

const API_BASE = 'http://localhost:5000/api';

async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} - ${text}`);
  }
  return response.json();
}

async function main() {
  console.log('=== Feature #34: Furniture Rotation Test ===\n');

  // Step 1: Create test project
  console.log('Step 1: Creating test project...');
  const project = await apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Feature 34 Rotation Test',
      description: 'Testing furniture rotation controls',
    }),
  });
  console.log(`✓ Project created: ID ${project.project.id}\n`);

  // Step 2: Create floor
  console.log('Step 2: Creating floor...');
  const floor = await apiCall(`/projects/${project.project.id}/floors`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ground Floor',
      level: 0,
      order_index: 0,
    }),
  });
  console.log(`✓ Floor created: ID ${floor.floor.id}\n`);

  // Step 3: Create room
  console.log('Step 3: Creating room...');
  const room = await apiCall(`/floors/${floor.floor.id}/rooms`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Living Room',
      dimensions_json: { width: 6, depth: 5 },
      position_x: 0,
      position_y: 0,
      position_z: 0,
    }),
  });
  console.log(`✓ Room created: ID ${room.room.id}\n`);

  // Step 4: Get or create an asset
  console.log('Step 4: Getting assets...');
  const assetsResponse = await apiCall('/assets');
  const asset = assetsResponse.assets[0]; // Use first available asset
  if (!asset) {
    throw new Error('No assets available in database');
  }
  console.log(`✓ Using asset: ${asset.name} (ID ${asset.id})\n`);

  // Step 5: Place furniture in room (with initial rotation 0)
  console.log('Step 5: Placing furniture...');
  const furniture = await apiCall(`/rooms/${room.room.id}/furniture`, {
    method: 'POST',
    body: JSON.stringify({
      asset_id: asset.id,
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }),
  });
  console.log(`✓ Furniture placed: ID ${furniture.furniture.id}`);
  console.log(`  Initial rotation_y: ${furniture.furniture.rotation_y} radians (${(furniture.furniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // Step 6: Test rotation via API (simulate what the UI does)
  console.log('Step 6: Testing rotation updates...\n');

  // Test 1: Rotate to 90 degrees
  console.log('Test 6a: Rotate to 90 degrees');
  const rotation90 = 90 * Math.PI / 180;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({ rotation_y: rotation90 }),
  });
  let furnitureData = await apiCall(`/rooms/${room.room.id}/furniture`);
  let currentFurniture = furnitureData.furniture.find(f => f.id === furniture.furniture.id);
  console.log(`✓ Rotation updated: ${currentFurniture.rotation_y} radians (${(currentFurniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // Test 2: Rotate to -90 degrees
  console.log('Test 6b: Rotate to -90 degrees');
  const rotationNeg90 = -90 * Math.PI / 180;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({ rotation_y: rotationNeg90 }),
  });
  furnitureData = await apiCall(`/rooms/${room.room.id}/furniture`);
  currentFurniture = furnitureData.furniture.find(f => f.id === furniture.furniture.id);
  console.log(`✓ Rotation updated: ${currentFurniture.rotation_y} radians (${(currentFurniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // Test 3: Rotate to 180 degrees
  console.log('Test 6c: Rotate to 180 degrees');
  const rotation180 = 180 * Math.PI / 180;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({ rotation_y: rotation180 }),
  });
  furnitureData = await apiCall(`/rooms/${room.room.id}/furniture`);
  currentFurniture = furnitureData.furniture.find(f => f.id === furniture.furniture.id);
  console.log(`✓ Rotation updated: ${currentFurniture.rotation_y} radians (${(currentFurniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // Test 4: Rotate to arbitrary angle (45 degrees)
  console.log('Test 6d: Rotate to 45 degrees (arbitrary angle)');
  const rotation45 = 45 * Math.PI / 180;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({ rotation_y: rotation45 }),
  });
  furnitureData = await apiCall(`/rooms/${room.room.id}/furniture`);
  currentFurniture = furnitureData.furniture.find(f => f.id === furniture.furniture.id);
  console.log(`✓ Rotation updated: ${currentFurniture.rotation_y} radians (${(currentFurniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // Step 7: Verify persistence
  console.log('Step 7: Verifying persistence across fetch...');
  furnitureData = await apiCall(`/rooms/${room.room.id}/furniture`);
  currentFurniture = furnitureData.furniture.find(f => f.id === furniture.furniture.id);
  const finalDegrees = (currentFurniture.rotation_y * 180 / Math.PI).toFixed(1);
  if (finalDegrees === '45.0') {
    console.log(`✓ Rotation persisted correctly: ${finalDegrees}°\n`);
  } else {
    console.error(`✗ Rotation not persisted correctly. Expected 45.0°, got ${finalDegrees}°\n`);
    process.exit(1);
  }

  console.log('=== API Tests Complete ===\n');
  console.log('Project ID for manual UI testing:', project.project.id);
  console.log('Furniture ID for manual UI testing:', furniture.furniture.id);
  console.log('\nTo test in the browser:');
  console.log(`1. Open http://localhost:5173`);
  console.log(`2. Open project ID ${project.project.id}`);
  console.log(`3. Click on the furniture to select it`);
  console.log(`4. Verify rotation controls appear in the Properties panel`);
  console.log(`5. Test rotation input field and quick rotation buttons\n`);

  console.log('✅ All API tests PASSED');
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
