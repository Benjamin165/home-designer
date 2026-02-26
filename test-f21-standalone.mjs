#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

await page.goto('http://localhost:5181/editor/4');
await page.waitForTimeout(2000);

console.log('Current URL:', page.url());

// Click Draw Wall if not already selected
try {
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);
  console.log('Clicked Draw Wall button');
} catch (e) {
  console.log('Draw Wall already selected or not found:', e.message);
}

// Get canvas element for drawing
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

if (!box) {
  console.log('Canvas not found!');
  await browser.close();
  process.exit(1);
}

console.log('Canvas found:', box);

// Calculate drag coordinates
const startX = box.x + box.width / 2;
const startY = box.y + box.height / 2;
const endX = startX + 200;
const endY = startY + 150;

console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(200);

// Move gradually to trigger live dimension display
for (let step = 1; step <= 10; step++) {
  const x = startX + (endX - startX) * step / 10;
  const y = startY + (endY - startY) * step / 10;
  await page.mouse.move(x, y);
  await page.waitForTimeout(50);
}

console.log('Taking screenshot DURING drag (should show dimensions)...');
await page.screenshot({ path: 'test-f21-during-drag-standalone.png', fullPage: false });

// Release mouse
await page.mouse.up();
await page.waitForTimeout(1000);

console.log('Taking screenshot AFTER release...');
await page.screenshot({ path: 'test-f21-after-release-standalone.png', fullPage: false });

console.log('Test complete!');
await browser.close();
