#!/usr/bin/env node
import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Feature 21 Test Project...');
  await page.goto('http://localhost:5173/editor/1');
  await page.waitForTimeout(2000);

  console.log('Looking for Modern Chair in asset library...');

  // Find the Modern Chair element
  try {
    await page.waitForSelector('text=Modern Chair', { timeout: 5000 });
    console.log('✓ Modern Chair found in asset library');
  } catch (e) {
    console.error('✗ Modern Chair not found!');
    await page.screenshot({ path: 'D:\\repos\\home-designer\\f32-error-no-chair.png' });
    await browser.close();
    process.exit(1);
  }

  // Get the chair element's bounding box
  const chairElement = page.locator('text=Modern Chair').first();
  const chairBox = await chairElement.boundingBox();

  // Get the canvas (3D viewport)
  const canvas = page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  console.log('Chair position:', chairBox);
  console.log('Canvas position:', canvasBox);

  // Calculate drag coordinates
  const startX = chairBox.x + chairBox.width / 2;
  const startY = chairBox.y + chairBox.height / 2;
  const endX = canvasBox.x + canvasBox.width / 2;
  const endY = canvasBox.y + canvasBox.height / 2;

  console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Take screenshot during drag
  await page.screenshot({ path: 'D:\\repos\\home-designer\\f32-regression-during.png' });
  console.log('✓ Screenshot during drag saved');

  // Move in steps to simulate realistic drag
  const steps = 15;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(30);
  }

  await page.mouse.up();
  await page.waitForTimeout(1500);

  console.log('✓ Drag operation completed');

  // Take screenshot after drop
  await page.screenshot({ path: 'D:\\repos\\home-designer\\f32-regression-after.png' });
  console.log('✓ Screenshot after drop saved');

  // Check for console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.waitForTimeout(1000);

  if (errors.length > 0) {
    console.log('✗ Console errors detected:', errors);
  } else {
    console.log('✓ No console errors detected');
  }

  console.log('\n=== Feature 32 Regression Test Complete ===');
  console.log('Check screenshots:');
  console.log('  - f32-regression-during.png (during drag)');
  console.log('  - f32-regression-after.png (after drop)');

  await browser.close();
  console.log('Browser closed.');
})();
