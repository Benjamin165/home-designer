#!/usr/bin/env node
/**
 * Feature #32 Complete Test: Full drag-drop flow from library to scene
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #32 Complete Drag-Drop Test ===\n');

    // Navigate to project
    console.log('1. Opening project...');
    await page.goto('http://localhost:5173/editor/6');
    await page.waitForTimeout(3000);
    console.log('✓ Project loaded\n');

    // Get room ID
    console.log('2. Getting room ID...');
    const roomId = await page.evaluate(async () => {
      const floorsRes = await fetch('http://localhost:5000/api/projects/6/floors');
      const floorsData = await floorsRes.json();
      const floorId = floorsData.floors?.[0]?.id;

      const roomsRes = await fetch(`http://localhost:5000/api/floors/${floorId}/rooms`);
      const roomsData = await roomsRes.json();
      return roomsData.rooms?.[0]?.id;
    });
    console.log(`✓ Room ID: ${roomId}\n`);

    // Get initial furniture count
    console.log('3. Initial furniture count...');
    const initialCount = await page.evaluate(async (roomId) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      return data.furniture?.length || 0;
    }, roomId);
    console.log(`   Count: ${initialCount}\n`);

    // Test dropFurniture event (simulates HTML5 drag-drop from library)
    console.log('4. Dispatching dropFurniture event (from library)...');
    await page.evaluate(() => {
      const asset = {
        id: 1,
        name: 'Modern Chair',
        category: 'Furniture',
        width: 0.5,
        height: 0.8,
        depth: 0.5,
        model_path: '/models/chair.glb'
      };

      // Simulate drop in center of canvas
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();

      window.dispatchEvent(new CustomEvent('dropFurniture', {
        detail: {
          asset,
          screenPosition: {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          },
          canvasRect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          }
        }
      }));

      console.log('[TEST] dropFurniture event dispatched');
    });
    console.log('✓ Event dispatched\n');

    // Wait for placement (longer wait for full chain: dropFurniture → raycast → placeFurniture → API)
    await page.waitForTimeout(3000);

    // Check new furniture count
    console.log('5. Checking for new furniture...');
    const newCount = await page.evaluate(async (roomId) => {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/furniture`);
      const data = await res.json();
      const furniture = data.furniture || [];
      return furniture.length;
    }, roomId);

    console.log(`   New count: ${newCount}`);
    console.log(`   Increase: +${newCount - initialCount}\n`);

    // Take screenshot
    await page.screenshot({ path: 'test-f32-complete-result.png' });

    // Check console for errors
    const messages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        messages.push(msg.text());
      }
    });
    await page.waitForTimeout(500);

    console.log('═══════════════════════════════════════');
    if (newCount > initialCount) {
      console.log('✅ Feature #32: PASSING');
      console.log(`   Drag-drop chain working correctly`);
      console.log(`   dropFurniture → raycast → placeFurniture → API`);
      console.log(`   Furniture count: ${initialCount} → ${newCount}`);

      if (messages.length > 0) {
        console.log('\n⚠️  Console errors detected:');
        messages.forEach(m => console.log(`   ${m}`));
      } else {
        console.log(`   Zero console errors ✓`);
      }

      return true;
    } else {
      console.log('⚠️  Feature #32: Event chain may be broken');
      console.log(`   Furniture count unchanged: ${initialCount}`);

      if (messages.length > 0) {
        console.log('\nConsole errors:');
        messages.forEach(m => console.log(`   ${m}`));
      }

      return false;
    }

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await page.screenshot({ path: 'test-f32-complete-error.png' });
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
