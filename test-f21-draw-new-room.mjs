#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to Feature 21 Test Project
await page.goto('http://localhost:5181/editor/1');
await page.waitForTimeout(2000);

console.log('Current URL:', page.url());

// Click Draw Wall button
await page.getByRole('button', { name: 'Draw Wall' }).click();
await page.waitForTimeout(500);
console.log('Draw Wall tool selected');

// Get canvas element
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

if (!box) {
  console.log('Canvas not found!');
  await browser.close();
  process.exit(1);
}

// Draw in a different area (top-right) to avoid the existing room
const startX = box.x + box.width * 0.7;
const startY = box.y + box.height * 0.3;
const endX = startX + 150;
const endY = startY + 100;

console.log(`Drawing from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Take screenshot before drag
await page.screenshot({ path: 'test-f21-before-drag.png' });
console.log('Screenshot taken: before drag');

// Start drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(200);

// Move gradually (10 steps)
for (let step = 1; step <= 10; step++) {
  const x = startX + (endX - startX) * step / 10;
  const y = startY + (endY - startY) * step / 10;
  await page.mouse.move(x, y);
  await page.waitForTimeout(50);
}

console.log('Taking screenshot DURING drag (dimensions should be visible)...');
await page.screenshot({ path: 'test-f21-during-drag-dimensions.png' });

// Hold for a moment to see dimensions clearly
await page.waitForTimeout(500);

// Release
await page.mouse.up();
await page.waitForTimeout(1000);

console.log('Taking screenshot AFTER release (room should be created)...');
await page.screenshot({ path: 'test-f21-after-release-room.png' });

console.log('Test complete! Check the screenshots.');
await browser.close();
