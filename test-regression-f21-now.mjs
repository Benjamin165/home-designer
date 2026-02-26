#!/usr/bin/env node
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  // Draw Wall tool should already be selected
  console.log('Taking before-drag screenshot...');
  await page.screenshot({ path: 'test-f21-regression-before.png' });

  // Get viewport bounds
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('Canvas not found');
    await browser.close();
    return;
  }

  // Start position: center-left area
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.5;

  // End position: drag to the right and down
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.7;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(300);

  console.log('Taking during-drag screenshot...');
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-f21-regression-during.png' });

  // Release
  await page.mouse.up();
  await page.waitForTimeout(1000);

  console.log('Taking after-release screenshot...');
  await page.screenshot({ path: 'test-f21-regression-after.png' });

  // Check console for errors
  const messages = [];
  page.on('console', msg => messages.push(msg.text()));

  console.log('Screenshots saved. Check for dimension display in test-f21-regression-during.png');

  await browser.close();
})();
