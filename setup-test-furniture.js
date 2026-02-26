/**
 * Setup test furniture for Feature #25 testing
 */

const API_BASE = 'http://localhost:5000/api';

async function setupTestData() {
  try {
    // Step 1: Create a test asset
    console.log('Creating test asset...');
    const assetRes = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Chair',
        category: 'Furniture',
        subcategory: 'Seating',
        source: 'builtin',
        model_path: '/models/test-chair.glb',
        thumbnail_path: '/thumbnails/test-chair.png',
        width: 0.5,
        height: 1.0,
        depth: 0.5
      })
    });

    if (!assetRes.ok) {
      throw new Error(`Failed to create asset: ${assetRes.status}`);
    }

    const assetData = await assetRes.json();
    const asset = assetData.asset;
    console.log(`✓ Asset created: ${asset.name} (ID: ${asset.id})`);

    // Step 2: Place furniture in room 2
    console.log('\nPlacing furniture in room...');
    const furnitureRes = await fetch(`${API_BASE}/rooms/2/furniture`, {
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

    if (!furnitureRes.ok) {
      throw new Error(`Failed to place furniture: ${furnitureRes.status}`);
    }

    const furnitureData = await furnitureRes.json();
    console.log(`✓ Furniture placed (ID: ${furnitureData.furniture.id})`);

    console.log('\n=== Test Data Ready ===');
    console.log('✓ Room 2 now has 1 furniture item');
    console.log('✓ Ready to test delete room with furniture warning');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupTestData();
