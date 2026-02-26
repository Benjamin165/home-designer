import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages().find(p => p.url().includes('editor'));

if (!page) {
  console.log('No editor page found');
  process.exit(1);
}

// Wait for the canvas to be ready
await page.waitForTimeout(1000);

// Get the canvas element (the 3D viewport)
const canvas = await page.$('canvas');
if (!canvas) {
  console.log('Canvas not found');
  process.exit(1);
}

// Get the bounding box of the canvas
const box = await canvas.boundingBox();
console.log('Canvas box:', box);

// Calculate drag coordinates (center area of canvas)
const startX = box.x + box.width * 0.4;
const startY = box.y + box.height * 0.4;
const endX = box.x + box.width * 0.6;
const endY = box.y + box.height * 0.6;

console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform the drag operation
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(100);

// Take screenshot during drag
await page.screenshot({ path: 'feature21-during-drag.png' });
console.log('Screenshot taken during drag');

await page.mouse.move(endX, endY);
await page.waitForTimeout(100);

// Take screenshot before release
await page.screenshot({ path: 'feature21-before-release.png' });
console.log('Screenshot taken before release');

await page.mouse.up();
await page.waitForTimeout(500);

// Take screenshot after release
await page.screenshot({ path: 'feature21-after-release.png' });
console.log('Screenshot taken after release');

// Check console for errors
const logs = [];
page.on('console', msg => logs.push(msg.text()));
await page.waitForTimeout(1000);

console.log('Console logs:', logs);
console.log('Test completed');
