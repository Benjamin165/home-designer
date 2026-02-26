import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
const context = contexts[0];
const pages = await context.pages();
const page = pages.find(p => p.url().includes('editor'));

console.log('Current URL:', page.url());

// Take screenshot before drag
await page.screenshot({ path: 'before-drag-feature21.png' });
console.log('Screenshot saved: before-drag-feature21.png');

// Find the canvas element (3D viewport)
const canvas = await page.locator('canvas').first();

// Get canvas bounding box
const box = await canvas.boundingBox();
console.log('Canvas position:', box);

// Calculate drag coordinates (center area of canvas)
const startX = box.x + box.width * 0.3;
const startY = box.y + box.height * 0.3;
const endX = box.x + box.width * 0.6;
const endY = box.y + box.height * 0.6;

console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform drag operation
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(100);

// Move slowly to allow dimensions to update
for (let i = 0; i <= 10; i++) {
  const x = startX + (endX - startX) * (i / 10);
  const y = startY + (endY - startY) * (i / 10);
  await page.mouse.move(x, y);
  await page.waitForTimeout(50);
}

// Take screenshot during drag to see dimensions
await page.screenshot({ path: 'during-drag-feature21.png' });
console.log('Screenshot saved: during-drag-feature21.png');

await page.mouse.up();
await page.waitForTimeout(500);

// Take screenshot after drag
await page.screenshot({ path: 'after-drag-feature21.png' });
console.log('Screenshot saved: after-drag-feature21.png');

// Check for console errors
const errors = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    errors.push(msg.text());
  }
});

console.log('Drag complete!');
console.log('Errors:', errors.length > 0 ? errors : 'None');

await browser.disconnect();
