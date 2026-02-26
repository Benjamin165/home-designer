#!/usr/bin/env node

/**
 * Feature #70: Complete furniture CRUD cycle works end-to-end
 *
 * Tests all CRUD operations:
 * - Create: Place furniture in room
 * - Read: View furniture properties
 * - Update: Move and rotate furniture
 * - Delete: Remove furniture
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
  console.log('=== Feature #70: Complete Furniture CRUD Cycle Test ===\n');

  // Step 1: Create test project
  console.log('Step 1: Creating test project...');
  const project = await apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Feature 70 CRUD Test',
      description: 'Testing complete furniture CRUD cycle',
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

  // Step 4: Get an asset (sofa)
  console.log('Step 4: Getting assets...');
  const assetsResponse = await apiCall('/assets');
  const asset = assetsResponse.assets.find(a => a.category === 'Furniture') || assetsResponse.assets[0];
  console.log(`✓ Using asset: ${asset.name} (ID ${asset.id})\n`);

  // ===== CREATE =====
  console.log('=== CRUD: CREATE ===');
  console.log('Step 5: Placing furniture (Create)...');
  const furniture = await apiCall(`/rooms/${room.room.id}/furniture`, {
    method: 'POST',
    body: JSON.stringify({
      asset_id: asset.id,
      position_x: 1.0,
      position_y: 0,
      position_z: 1.0,
      rotation_x: 0,
      rotation_y: 0,
      rotation_z: 0,
    }),
  });
  console.log(`✓ Furniture placed: ID ${furniture.furniture.id}`);
  console.log(`  Position: (${furniture.furniture.position_x}, ${furniture.furniture.position_y}, ${furniture.furniture.position_z})`);
  console.log(`  Rotation: ${furniture.furniture.rotation_y} rad\n`);

  // ===== READ =====
  console.log('=== CRUD: READ ===');
  console.log('Step 6: Reading furniture properties...');
  const furnitureList = await apiCall(`/rooms/${room.room.id}/furniture`);
  const readFurniture = furnitureList.furniture.find(f => f.id === furniture.furniture.id);
  if (!readFurniture) {
    throw new Error('Furniture not found in room');
  }
  console.log(`✓ Furniture retrieved: ${readFurniture.asset_name || 'Unknown'}`);
  console.log(`  Dimensions: ${readFurniture.width || 1}m × ${readFurniture.height || 1}m × ${readFurniture.depth || 1}m`);
  console.log(`  Position: (${readFurniture.position_x}, ${readFurniture.position_y}, ${readFurniture.position_z})`);
  console.log(`  Rotation: ${readFurniture.rotation_y} rad (${(readFurniture.rotation_y * 180 / Math.PI).toFixed(1)}°)\n`);

  // ===== UPDATE (Move) =====
  console.log('=== CRUD: UPDATE (Move) ===');
  console.log('Step 7: Moving furniture to new position...');
  const newX = 2.5;
  const newZ = 3.0;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      position_x: newX,
      position_z: newZ,
    }),
  });
  const movedFurniture = await apiCall(`/rooms/${room.room.id}/furniture`);
  const updatedPos = movedFurniture.furniture.find(f => f.id === furniture.furniture.id);
  if (updatedPos.position_x !== newX || updatedPos.position_z !== newZ) {
    throw new Error(`Position not updated correctly. Expected (${newX}, ${newZ}), got (${updatedPos.position_x}, ${updatedPos.position_z})`);
  }
  console.log(`✓ Furniture moved: (${updatedPos.position_x}, ${updatedPos.position_y}, ${updatedPos.position_z})\n`);

  // ===== UPDATE (Rotate) =====
  console.log('=== CRUD: UPDATE (Rotate) ===');
  console.log('Step 8: Rotating furniture 90 degrees...');
  const rotation90 = 90 * Math.PI / 180;
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      rotation_y: rotation90,
    }),
  });
  const rotatedFurniture = await apiCall(`/rooms/${room.room.id}/furniture`);
  const updatedRot = rotatedFurniture.furniture.find(f => f.id === furniture.furniture.id);
  const degrees = (updatedRot.rotation_y * 180 / Math.PI).toFixed(1);
  if (Math.abs(parseFloat(degrees) - 90.0) > 0.1) {
    throw new Error(`Rotation not updated correctly. Expected 90.0°, got ${degrees}°`);
  }
  console.log(`✓ Furniture rotated: ${updatedRot.rotation_y} rad (${degrees}°)\n`);

  // ===== DELETE =====
  console.log('=== CRUD: DELETE ===');
  console.log('Step 9: Deleting furniture...');
  await apiCall(`/furniture/${furniture.furniture.id}`, {
    method: 'DELETE',
  });
  const afterDelete = await apiCall(`/rooms/${room.room.id}/furniture`);
  const deletedFurniture = afterDelete.furniture.find(f => f.id === furniture.furniture.id);
  if (deletedFurniture) {
    throw new Error('Furniture still exists after deletion');
  }
  console.log(`✓ Furniture deleted successfully`);
  console.log(`  Furniture count in room: ${afterDelete.furniture.length}\n`);

  console.log('=== All CRUD Operations Complete ===\n');
  console.log('Feature #70 Verification Summary:');
  console.log('✅ CREATE: Place furniture in room');
  console.log('✅ READ: View furniture properties');
  console.log('✅ UPDATE: Move furniture to new position');
  console.log('✅ UPDATE: Rotate furniture 90 degrees');
  console.log('✅ DELETE: Remove furniture from room\n');

  console.log('Complete CRUD cycle verified successfully!');
  console.log(`\nTest project: ${project.project.name} (ID ${project.project.id})`);
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
