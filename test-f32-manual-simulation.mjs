#!/usr/bin/env node
/**
 * Manual simulation of drag-and-drop by directly calling the event handlers
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #32: Manual Simulation Test ===\n');

    await page.goto('http://localhost:5190/editor/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded\n');

    // Get initial count
    const initialCount = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return data.placements?.length || 0;
    });
    console.log(`Initial furniture count: ${initialCount}\n`);

    // Manually simulate the entire drag-and-drop flow
    console.log('Simulating drag-and-drop by manually calling event handlers...\n');

    const result = await page.evaluate(async () => {
      // Step 1: Get the asset data
      const assetResponse = await fetch('http://localhost:5000/api/assets?category=Furniture');
      const assetData = await assetResponse.json();
      const diningTable = assetData.assets.find(a => a.name === 'Dining Table');

      if (!diningTable) {
        return { success: false, error: 'Could not find Dining Table asset' };
      }

      console.log('[TEST] Found asset:', diningTable);

      // Step 2: Simulate the drag-and-drop by dispatching the placeFurniture event directly
      // This bypasses the UI drag-and-drop and directly triggers the placement logic
      const dropPosition = {
        x: 0,  // Center of room
        y: 0,
        z: 0
      };

      console.log('[TEST] Dispatching placeFurniture event with position:', dropPosition);

      window.dispatchEvent(
        new CustomEvent('placeFurniture', {
          detail: {
            asset: diningTable,
            position: dropPosition
          }
        })
      );

      // Wait a bit for the event to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if furniture was placed
      const checkResponse = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const checkData = await checkResponse.json();

      return {
        success: true,
        initialCount: 0,
        newCount: checkData.placements?.length || 0,
        placements: checkData.placements
      };
    });

    console.log('Result:', result);

    if (result.success && result.newCount > initialCount) {
      console.log(`\n✅ SUCCESS! Furniture placed (${initialCount} -> ${result.newCount})`);
      console.log('\nPlaced furniture:');
      result.placements.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.asset_name} at (${p.position_x.toFixed(2)}, ${p.position_y.toFixed(2)}, ${p.position_z.toFixed(2)})`);
      });
    } else {
      console.log(`\n❌ FAILED - Furniture not placed`);
      console.log('Debug info:', result);
    }

    // Screenshot
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-f32-manual-sim.png' });
    console.log('\nScreenshot saved: test-f32-manual-sim.png');

    return result.success && result.newCount > initialCount;

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-f32-manual-sim-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1));
