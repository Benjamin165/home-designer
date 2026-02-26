#!/usr/bin/env node

/**
 * Test Feature #105: Sidebars collapse gracefully on narrow screens
 * Simple manual test
 */

import { chromium } from 'playwright';

async function test() {
  console.log('Testing Feature #105: Responsive sidebars\n');

  const browser = await chromium.launch({ headless: false });

  // Test at tablet width from the start
  console.log('1. Opening browser at tablet width (768x1024)...');
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 }
  });
  const page = await context.newPage();

  try {
    await page.goto('http://localhost:5180');
    await page.waitForTimeout(1000);

    console.log('2. Opening first project...');
    await page.locator('.cursor-pointer').first().click();
    await page.waitForTimeout(2000);

    // Take screenshot at tablet width
    await page.screenshot({ path: 'test-105-tablet-initial.png' });
    console.log('   ✓ Screenshot: test-105-tablet-initial.png');

    // Check Asset Library width
    const assetLibrary = await page.locator('.bg-gray-800.border-r.border-gray-700').first().boundingBox();
    console.log(`   Asset Library width: ${assetLibrary?.width}px`);

    if (assetLibrary && assetLibrary.width <= 50) {
      console.log('   ✓ Asset Library is collapsed');
    } else {
      console.log('   ✗ Asset Library is NOT collapsed');
    }

    // Try to expand it
    console.log('\n3. Clicking expand button...');
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const box = await btn.boundingBox();
      if (box && box.x < 100) { // Left side button
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-105-tablet-expanded.png' });
    console.log('   ✓ Screenshot: test-105-tablet-expanded.png');

    const assetLibraryExpanded = await page.locator('.bg-gray-800.border-r.border-gray-700').first().boundingBox();
    console.log(`   Asset Library width after expand: ${assetLibraryExpanded?.width}px`);

    // Check if it has absolute positioning
    const position = await page.locator('.bg-gray-800.border-r.border-gray-700').first().evaluate(el => {
      return window.getComputedStyle(el).position;
    });
    console.log(`   Position style: ${position}`);

    if (position === 'absolute') {
      console.log('   ✓ Asset Library overlays viewport (absolute position)');
    } else {
      console.log('   ⚠ Asset Library uses relative position');
    }

    console.log('\n✅ Test complete! Check screenshots.');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

test();
