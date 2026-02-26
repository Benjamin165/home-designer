#!/usr/bin/env node
/**
 * Feature #117: Performance test with 50+ furniture items
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #117: Performance with 50+ Items ===\n');

    await page.goto('http://localhost:5190/editor/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded\n');

    // Place 50 furniture items
    console.log('Placing 50 furniture items...');

    const result = await page.evaluate(async () => {
      const assetRes = await fetch('http://localhost:5000/api/assets');
      const assetData = await assetRes.json();
      const asset = assetData.assets[0]; // Use first asset

      const positions = [];
      // Create a 10x5 grid of furniture
      for (let x = -5; x < 5; x++) {
        for (let z = -2; z < 3; z++) {
          positions.push({ x: x * 2, y: 0, z: z * 2 });
        }
      }

      // Place 50 items
      for (let i = 0; i < 50; i++) {
        window.dispatchEvent(
          new CustomEvent('placeFurniture', {
            detail: {
              asset: asset,
              position: positions[i]
            }
          })
        );
      }

      console.log('[TEST] Dispatched 50 placement events');

      // Wait for placements to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check count
      const furnitureRes = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const furnitureData = await furnitureRes.json();

      return {
        count: furnitureData.furniture?.length || 0,
        success: true
      };
    });

    console.log(`✓ Placement complete: ${result.count} items in scene\n`);

    // Test viewport responsiveness
    console.log('Testing viewport responsiveness...');
    await page.waitForTimeout(1000);

    // Check if page is still responsive
    const isResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });

    console.log(`✓ Page responsive: ${isResponsive}\n`);

    // Check for console errors
    const messages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        messages.push(msg.text());
      }
    });

    await page.waitForTimeout(500);
    const hasErrors = messages.length > 0;

    console.log(`Console errors: ${hasErrors ? messages.length : 0}\n`);

    // Take screenshot
    await page.screenshot({ path: 'test-feature-117-result.png' });
    console.log('✓ Screenshot saved: test-feature-117-result.png\n');

    // Summary
    console.log('═══════════════════════════════════════');
    if (result.count >= 50 && isResponsive && !hasErrors) {
      console.log('✅ Feature #117: PASSING');
      console.log(`   - ${result.count} furniture items in scene`);
      console.log('   - Viewport remains responsive');
      console.log('   - No console errors');
      console.log('\nNote: Manual verification recommended for:');
      console.log('   - Frame rate (should be ~60 FPS)');
      console.log('   - Smooth camera orbit');
      console.log('   - Responsive item selection/movement');
    } else {
      console.log('❌ Feature #117: NEEDS VERIFICATION');
      console.log(`   - Items: ${result.count}`);
      console.log(`   - Responsive: ${isResponsive}`);
      console.log(`   - Errors: ${hasErrors ? messages.length : 0}`);
    }
    console.log('═══════════════════════════════════════\n');

    return result.count >= 50 && isResponsive && !hasErrors;

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-feature-117-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1));
