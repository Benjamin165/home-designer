#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to the editor with Test Project Open
await page.goto('http://localhost:5181/editor/4');
await page.waitForTimeout(2000);

// Click the Draw Wall button
await page.getByRole('button', { name: 'Draw Wall' }).click();
await page.waitForTimeout(500);

console.log('Draw Wall tool activated. Taking before-drag screenshot...');
await page.screenshot({ path: 'test-f21-before-drag-regression.png' });

// Get the canvas element and perform drag
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

const startX = box.x + box.width * 0.3;
const startY = box.y + box.height * 0.4;
const endX = box.x + box.width * 0.6;
const endY = box.y + box.height * 0.7;

console.log(`Starting drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform the drag
await page.mouse.move(startX, startY);
await page.mouse.down();

// Move slowly to simulate dragging and capture during drag
await page.mouse.move(startX + (endX - startX) * 0.5, startY + (endY - startY) * 0.5, { steps: 10 });
await page.waitForTimeout(500);

console.log('Taking during-drag screenshot to check for dimension display...');
await page.screenshot({ path: 'test-f21-during-drag-regression.png' });

// Complete the drag
await page.mouse.move(endX, endY, { steps: 10 });
await page.waitForTimeout(500);

console.log('Taking before-release screenshot...');
await page.screenshot({ path: 'test-f21-before-release-regression.png' });

// Release the mouse
await page.mouse.up();
await page.waitForTimeout(1000);

console.log('Taking after-release screenshot...');
await page.screenshot({ path: 'test-f21-after-release-regression.png' });

// Check console for errors
const logs = [];
page.on('console', msg => logs.push(msg.text()));

await page.waitForTimeout(1000);

console.log('\n=== VERIFICATION ===');
console.log('Screenshots saved:');
console.log('  - test-f21-before-drag-regression.png');
console.log('  - test-f21-during-drag-regression.png');
console.log('  - test-f21-before-release-regression.png');
console.log('  - test-f21-after-release-regression.png');

await browser.close();
