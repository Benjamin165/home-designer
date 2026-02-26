#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
const page = contexts[0].pages()[0];

console.log('Current URL:', page.url());

// Get viewport center for dragging
const viewport = page.viewportSize();
const startX = viewport.width / 2;
const startY = viewport.height / 2;
const endX = startX + 200;
const endY = startY + 150;

console.log(`Starting drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(100);

// Move mouse while holding down button
await page.mouse.move(endX, endY, { steps: 10 });
await page.waitForTimeout(500); // Wait to see dimensions display

console.log('Taking screenshot during drag...');
await page.screenshot({ path: 'test-f21-during-drag-now.png' });

await page.mouse.up();
await page.waitForTimeout(500);

console.log('Taking screenshot after release...');
await page.screenshot({ path: 'test-f21-after-release-now.png' });

console.log('Drag complete!');
await browser.close();
