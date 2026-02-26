#!/usr/bin/env node

import { chromium } from 'playwright';

async function testFeature21() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to editor
    console.log('Opening editor...');
    await page.goto('http://localhost:5173/editor/1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click Draw Wall tool
    console.log('Activating Draw Wall tool...');
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await page.waitForTimeout(500);

    // Find canvas
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    console.log('Canvas found');

    // Calculate drag coordinates
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.6;
    const endX = box.x + box.width * 0.6;
    const endY = box.y + box.height * 0.8;

    console.log('Performing drag with manual event dispatch...');

    // Move to start
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(200);

    // Mouse down
    await page.mouse.down();
    console.log('Mouse down');
    await page.waitForTimeout(300);

    // Drag
    for (let i = 1; i <= 10; i++) {
      const x = startX + (endX - startX) * (i / 10);
      const y = startY + (endY - startY) * (i / 10);
      await page.mouse.move(x, y);
      await page.waitForTimeout(50);
    }
    console.log('Drag complete');
    await page.waitForTimeout(500);

    // Manually dispatch pointerup event on canvas
    console.log('Manually dispatching pointerup event...');
    await page.evaluate(({ x, y }) => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const event = new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: 0,
          pointerType: 'mouse',
        });
        canvas.dispatchEvent(event);
        console.log('[Manual] pointerup event dispatched on canvas');
      }
    }, { x: endX, y: endY });

    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-f21-manual-result.png' });
    console.log('Screenshot saved');

    // Check room count
    const roomsAfter = await page.evaluate(() => {
      const statsText = document.body.textContent;
      const match = statsText.match(/Rooms on This Floor[^0-9]*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });

    console.log(`Rooms after: ${roomsAfter}`);

    if (roomsAfter > 1) {
      console.log('✅ Room was created!');
      return true;
    } else {
      console.log('❌ Room was not created');
      return false;
    }

  } catch (error) {
    console.error('Error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

testFeature21()
  .then(success => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
