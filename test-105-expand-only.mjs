#!/usr/bin/env node

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 767, height: 1024 } });
  const page = await context.newPage();

  try {
    console.log('Opening editor at 767px width...');
    await page.goto('http://localhost:5180');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click first project
    const projectCards = await page.locator('div').filter({ hasText: /Test|Regression/ }).all();
    if (projectCards.length > 0) {
      await projectCards[0].click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    console.log('Taking screenshot of collapsed state...');
    await page.screenshot({ path: 'test-expand-1-collapsed.png', fullPage: true });

    // Get AssetLibrary element
    const assetLibDiv = page.locator('div').filter({ hasText: 'Asset Library' }).first();
    const parentDiv = assetLibDiv.locator('..').first();

    let box = await parentDiv.boundingBox();
    console.log(`Asset Library width (collapsed): ${box?.width}px`);

    // Find expand button (should be a button with ChevronRight icon)
    console.log('\nLooking for expand button...');
    const buttons = await page.locator('button').all();

    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const btn = buttons[i];
      const btnBox = await btn.boundingBox();

      if (btnBox && btnBox.x < 60) {  // Left side of screen
        console.log(`Found button at x=${btnBox.x}, clicking...`);
        await btn.click();
        await page.waitForTimeout(1000);
        break;
      }
    }

    console.log('\nTaking screenshot of expanded state...');
    await page.screenshot({ path: 'test-expand-2-expanded.png', fullPage: true });

    // Check expanded state
    box = await parentDiv.boundingBox();
    const position = await parentDiv.evaluate(el => window.getComputedStyle(el).position);
    const zIndex = await parentDiv.evaluate(el => window.getComputedStyle(el).zIndex);
    const classList = await parentDiv.evaluate(el => el.className);

    console.log(`\nAsset Library after expand:`);
    console.log(`  Width: ${box?.width}px`);
    console.log(`  Position: ${position}`);
    console.log(`  Z-index: ${zIndex}`);
    console.log(`  Classes: ${classList}`);

    if (position === 'absolute') {
      console.log('\n✅ SUCCESS: Overlay behavior working (absolute position)');
    } else {
      console.log('\n⚠️ Not overlaying (position is relative)');
    }

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
