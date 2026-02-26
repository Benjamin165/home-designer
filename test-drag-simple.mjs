import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to the editor page that's already open
await page.goto('http://localhost:5173/editor/12');
await page.waitForTimeout(2000);

// Click the Draw Wall button
await page.getByRole('button', { name: 'Draw Wall' }).click();
await page.waitForTimeout(500);

console.log('Draw Wall tool selected');

// Find the canvas element
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

if (!box) {
  console.log('Canvas not found');
  await browser.close();
  process.exit(1);
}

console.log('Canvas dimensions:', box);

// Calculate drag coordinates (center area)
const startX = box.x + box.width * 0.4;
const startY = box.y + box.height * 0.5;
const endX = box.x + box.width * 0.6;
const endY = box.y + box.height * 0.7;

console.log(`Dragging from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${endY.toFixed(0)})`);

// Perform drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(300);

await page.screenshot({ path: 'feature21-test-during-drag.png' });
console.log('During drag screenshot taken');

// Move to end position
await page.mouse.move(endX, endY, { steps: 10 });
await page.waitForTimeout(300);

await page.screenshot({ path: 'feature21-test-before-release.png' });
console.log('Before release screenshot taken');

await page.mouse.up();
await page.waitForTimeout(1000);

await page.screenshot({ path: 'feature21-test-after-release.png' });
console.log('After release screenshot taken');

// Check if room was created
const roomElements = await page.locator('text=/Room/i').count();
console.log('Room elements found:', roomElements);

await browser.close();
console.log('Test completed');
