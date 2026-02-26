#!/usr/bin/env node
/**
 * Feature #113: Concurrent furniture placements do not conflict
 * Test rapid placement of multiple furniture items
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #113: Concurrent Furniture Placement ===\n');

    await page.goto('http://localhost:5190/editor/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded\n');

    // Get initial furniture count
    const initialCount = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return data.furniture?.length || 0;
    });
    console.log(`Initial furniture count: ${initialCount}\n`);

    // Get available assets
    const assets = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/assets');
      const data = await res.json();
      return data.assets.slice(0, 5); // Get first 5 assets
    });

    console.log(`Testing with ${assets.length} different furniture items:\n`);
    assets.forEach((a, i) => console.log(`  ${i + 1}. ${a.name} (ID: ${a.id})`));
    console.log();

    // Rapidly place 5 furniture items
    console.log('Placing furniture rapidly (concurrent)...\n');

    const results = await page.evaluate(async (assetsList) => {
      const positions = [
        { x: -1, y: 0, z: -1 },
        { x: 1, y: 0, z: -1 },
        { x: -1, y: 0, z: 1 },
        { x: 1, y: 0, z: 1 },
        { x: 0, y: 0, z: 0 }
      ];

      // Dispatch all placement events rapidly without waiting
      assetsList.forEach((asset, i) => {
        window.dispatchEvent(
          new CustomEvent('placeFurniture', {
            detail: {
              asset: asset,
              position: positions[i]
            }
          })
        );
        console.log(`[TEST] Dispatched placement ${i + 1}: ${asset.name} at (${positions[i].x}, ${positions[i].z})`);
      });

      // Wait for all placements to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check final count
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return {
        furniture: data.furniture || [],
        count: data.furniture?.length || 0
      };
    }, assets);

    console.log(`\nFinal furniture count: ${results.count}`);
    console.log(`Expected: ${initialCount + 5}`);
    console.log(`Placed: ${results.count - initialCount}\n`);

    // Check for unique IDs
    const ids = results.furniture.map(f => f.id);
    const uniqueIds = new Set(ids);
    const hasUniqueIds = ids.length === uniqueIds.size;

    console.log('ID Uniqueness Check:');
    console.log(`  Total IDs: ${ids.length}`);
    console.log(`  Unique IDs: ${uniqueIds.size}`);
    console.log(`  ${hasUniqueIds ? '✅ All IDs unique' : '❌ Duplicate IDs found!'}\n`);

    // Check that we got all 5 placements
    const expectedCount = initialCount + 5;
    const allPlaced = results.count === expectedCount;

    console.log('Placement Completeness:');
    console.log(`  ${allPlaced ? '✅ All 5 items placed' : `❌ Only ${results.count - initialCount}/5 items placed`}\n`);

    // List newest placements
    const newestItems = results.furniture.slice(-5);
    console.log('Newest 5 furniture items:');
    newestItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ID: ${item.id}, ${item.asset_name}, Position: (${item.position_x.toFixed(2)}, ${item.position_z.toFixed(2)})`);
    });

    // Take screenshot
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-feature-113-result.png' });
    console.log('\n✓ Screenshot saved: test-feature-113-result.png');

    // Summary
    console.log('\n═══════════════════════════════════════');
    if (allPlaced && hasUniqueIds) {
      console.log('✅ Feature #113: PASSING');
      console.log('   - All items placed successfully');
      console.log('   - No ID conflicts');
      console.log('   - Concurrent placements handled correctly');
    } else {
      console.log('❌ Feature #113: FAILING');
      if (!allPlaced) console.log('   - Not all items were placed');
      if (!hasUniqueIds) console.log('   - ID conflicts detected');
    }
    console.log('═══════════════════════════════════════\n');

    return allPlaced && hasUniqueIds;

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-feature-113-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1));
