#!/usr/bin/env node
/**
 * Feature #32 Verification: Drag furniture from library to 3D scene
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #32 Verification Test ===\n');

    // Navigate to project with room (ID=6 which we just created)
    console.log('1. Opening project with room (ID=6)...');
    await page.goto('http://localhost:5173/editor/6');
    await page.waitForTimeout(3000);
    console.log('✓ Project loaded\n');

    // Get floors first, then rooms
    console.log('2. Getting floors...');
    const floorData = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/projects/6/floors');
      const data = await res.json();
      return data.floors?.[0];
    });

    if (!floorData) {
      throw new Error('No floor found in project 6');
    }
    console.log(`✓ Floor ID: ${floorData.id}\n`);

    // Check room exists on this floor
    console.log('3. Verifying room exists...');
    const roomId = await page.evaluate(async (floorId) => {
      const res = await fetch(`http://localhost:5000/api/floors/${floorId}/rooms`);
      const data = await res.json();
      return data.rooms?.[0]?.id;
    }, floorData.id);

    if (!roomId) {
      throw new Error(`No room found on floor ${floorData.id}`);
    }
    console.log(`✓ Room ID: ${roomId}\n`);

    // Get initial furniture count
    console.log('4. Getting initial furniture count...');
    const initialCount = await page.evaluate(async (roomId) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      return data.placements?.length || 0;
    }, roomId);
    console.log(`✓ Initial count: ${initialCount}\n`);

    // Simulate furniture placement by dispatching placeFurniture event
    console.log('5. Dispatching placeFurniture event...');
    const placed = await page.evaluate(async (roomId) => {
      const asset = {
        id: 4,
        name: 'Dining Table',
        category: 'Furniture',
        subcategory: 'Tables',
        width: 1.5,
        height: 0.75,
        depth: 0.9,
        model_path: '/models/table.glb'
      };

      const position = { x: 2, y: 0, z: 2 };

      console.log('[TEST] Dispatching placeFurniture event...');
      window.dispatchEvent(new CustomEvent('placeFurniture', {
        detail: { asset, position }
      }));

      // Wait for placement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if furniture was placed
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      return data.placements?.length || 0;
    }, roomId);

    console.log(`✓ Furniture count after placement: ${placed}\n`);

    // Take screenshot
    console.log('6. Taking screenshot...');
    await page.screenshot({ path: 'test-f32-verify-result.png' });
    console.log('✓ Screenshot saved\n');

    // Check for console errors
    const messages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        messages.push(msg.text());
      }
    });
    await page.waitForTimeout(500);

    console.log('═══════════════════════════════════════');
    if (placed > initialCount) {
      console.log('✅ Feature #32: PASSING');
      console.log(`   Furniture successfully placed (${initialCount} -> ${placed})`);
      return true;
    } else {
      console.log('⚠️  Feature #32: Event handler may not be working');
      console.log(`   Furniture count unchanged: ${initialCount}`);
      return false;
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-f32-verify-error.png' });
    return false;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1)).catch(err => {
  console.error(err);
  process.exit(1);
});
