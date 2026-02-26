#!/usr/bin/env node
/**
 * Feature #32: Test with real browser drag and drop
 */

import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const page = await browser.newPage();

  try {
    console.log('=== Feature #32: Real Drag Test ===\n');

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

    // Find furniture and canvas
    const furnitureCard = page.locator('[draggable="true"]').filter({ hasText: 'Dining Table' }).first();
    const canvas = page.locator('canvas').first();

    await furnitureCard.waitFor({ state: 'visible' });
    await canvas.waitFor({ state: 'visible' });

    console.log('Performing native Playwright drag...');

    // Use Playwright's native drag and drop
    await furnitureCard.dragTo(canvas, {
      force: true,
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 400, y: 400 }
    });

    console.log('✓ Drag completed\n');

    // Wait for placement
    await page.waitForTimeout(2000);

    // Check new count
    const newCount = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5000/api/rooms/1/furniture');
      const data = await res.json();
      return data.placements?.length || 0;
    });

    console.log(`Furniture count after drag: ${newCount}`);

    if (newCount > initialCount) {
      console.log(`✅ SUCCESS! Furniture placed (${initialCount} -> ${newCount})\n`);
    } else {
      console.log(`❌ FAILED - No furniture placed\n`);
    }

    // Screenshot
    await page.screenshot({ path: 'test-f32-real-drag.png' });
    console.log('Screenshot saved: test-f32-real-drag.png\n');

    return newCount > initialCount;

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: 'test-f32-real-drag-error.png' });
    return false;
  } finally {
    await browser.close();
  }
}

test().then(success => process.exit(success ? 0 : 1));
