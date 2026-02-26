#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
const page = contexts[0].pages()[0];

console.log('Starting drag operation for Feature 21 test...');

// Get the canvas/viewport element
const viewport = await page.locator('canvas').first();
const box = await viewport.boundingBox();

if (!box) {
  console.error('Could not find canvas bounding box');
  process.exit(1);
}

console.log(`Canvas found at: ${box.x}, ${box.y}, size: ${box.width}x${box.height}`);

// Calculate drag coordinates (center area of canvas)
const startX = box.x + box.width * 0.3;
const startY = box.y + box.height * 0.3;
const endX = box.x + box.width * 0.7;
const endY = box.y + box.height * 0.7;

console.log(`Drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Take screenshot before drag
await page.screenshot({ path: 'test-f21-before-drag-v2.png' });
console.log('Screenshot taken: before drag');

// Perform drag operation
await page.mouse.move(startX, startY);
await page.mouse.down();
console.log('Mouse down at start position');

// Wait a bit then take screenshot during drag
await page.waitForTimeout(100);
await page.mouse.move(endX, endY, { steps: 10 });
await page.waitForTimeout(500);

// Take screenshot during drag to see dimensions
await page.screenshot({ path: 'test-f21-during-drag-v2.png' });
console.log('Screenshot taken: during drag (should show dimensions)');

// Release mouse
await page.mouse.up();
console.log('Mouse released');

// Wait for room creation
await page.waitForTimeout(1000);

// Take final screenshot
await page.screenshot({ path: 'test-f21-after-release-v2.png' });
console.log('Screenshot taken: after release');

// Check for console errors
const errors = await page.evaluate(() => {
  return window._testErrors || [];
});

console.log('Console errors:', errors.length === 0 ? 'None' : errors);
console.log('Test complete!');
