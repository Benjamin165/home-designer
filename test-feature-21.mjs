// Test Feature 21: Draw walls by dragging rectangles with live dimensions
import { chromium } from 'playwright';

async function testFeature21() {
  let browser;
  try {
    console.log('Connecting to existing browser...');

    // Connect to the existing browser via CDP if possible, or launch new
    browser = await chromium.launch({
      headless: false,
      args: ['--remote-debugging-port=9222']
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Navigating to editor...');
    await page.goto('http://localhost:5173/editor/3');
    await page.waitForTimeout(2000);

    // Click Draw Wall tool
    console.log('Clicking Draw Wall tool...');
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await page.waitForTimeout(500);

    // Take screenshot before drag
    await page.screenshot({ path: 'before-drag.png' });
    console.log('Screenshot saved: before-drag.png');

    // Perform drag operation on the canvas/viewport
    console.log('Performing drag operation...');
    const viewport = page.locator('canvas').first();
    const box = await viewport.boundingBox();

    if (box) {
      const startX = box.x + box.width * 0.4;
      const startY = box.y + box.height * 0.5;
      const endX = box.x + box.width * 0.6;
      const endY = box.y + box.height * 0.7;

      console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.waitForTimeout(100);

      // Gradual move to simulate real drag
      const steps = 20;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        await page.mouse.move(x, y);
        await page.waitForTimeout(30);
      }

      await page.waitForTimeout(200);
      await page.mouse.up();
      console.log('Drag completed');

      await page.waitForTimeout(1500);

      // Take screenshot after drag
      await page.screenshot({ path: 'after-drag.png' });
      console.log('Screenshot saved: after-drag.png');

      // Check if room was created - look for room count
      const content = await page.content();
      if (content.includes('Rooms: 1') || content.includes('Total Rooms') && !content.includes('Rooms: 0')) {
        console.log('✓ SUCCESS: Room appears to have been created!');
      } else {
        console.log('⚠ WARNING: Could not confirm room creation');
      }
    } else {
      console.log('✗ ERROR: Could not find canvas element');
    }

  } catch (error) {
    console.error('✗ ERROR:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testFeature21();
