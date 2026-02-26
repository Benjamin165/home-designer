#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Navigate to the editor
await page.goto('http://localhost:5181/editor/4');
await page.waitForTimeout(2000);

// Close any modals by clicking outside or pressing Escape
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// Click the Draw Wall button
await page.getByRole('button', { name: 'Draw Wall' }).click();
await page.waitForTimeout(500);

console.log('Draw Wall tool activated. Taking screenshot...');
await page.screenshot({ path: 'test-f21-ready.png' });

// Get the canvas element and perform drag
const canvas = await page.locator('canvas').first();
const box = await canvas.boundingBox();

const startX = box.x + box.width * 0.35;
const startY = box.y + box.height * 0.35;
const endX = box.x + box.width * 0.65;
const endY = box.y + box.height * 0.65;

console.log(`Starting drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

// Perform the drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(200);

// Move to midpoint and hold
await page.mouse.move(startX + (endX - startX) * 0.6, startY + (endY - startY) * 0.6, { steps: 15 });
await page.waitForTimeout(800);

console.log('Taking during-drag screenshot - checking for live dimensions...');
await page.screenshot({ path: 'test-f21-during-clean.png' });

// Complete the drag
await page.mouse.move(endX, endY, { steps: 5 });
await page.waitForTimeout(300);

// Release
await page.mouse.up();
await page.waitForTimeout(1500);

console.log('Taking after-release screenshot...');
await page.screenshot({ path: 'test-f21-after-clean.png' });

// Get the properties panel to check room count
const roomCount = await page.locator('text=Rooms on This Floor').locator('..').locator('div').last().textContent();
console.log(`Rooms on This Floor: ${roomCount}`);

await browser.close();
