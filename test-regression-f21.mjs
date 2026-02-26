#!/usr/bin/env node
import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  // Navigate to the current editor (Test Project Open - editor/4)
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await sleep(1500);

  // Count rooms before
  const roomsBefore = await page.evaluate(() => {
    const statsText = document.body.textContent;
    const match = statsText.match(/Rooms on This Floor[^0-9]*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  console.log(`Rooms before: ${roomsBefore}`);

  // Click Draw Wall tool
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await sleep(500);
  console.log('Draw Wall tool activated');

  // Get canvas and perform drag
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found');
  }

  // Calculate drag coordinates
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.6;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.8;

  console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await sleep(200);
  await page.mouse.down();
  await sleep(300);

  // Move in steps
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await sleep(50);
  }

  await sleep(500);
  await page.mouse.up();
  console.log('Drag complete');
  await sleep(2000);

  // Check if room was created
  const roomsAfter = await page.evaluate(() => {
    const statsText = document.body.textContent;
    const match = statsText.match(/Rooms on This Floor[^0-9]*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });

  console.log(`Rooms after: ${roomsAfter}`);

  // Take screenshot
  await page.screenshot({ path: 'test-regression-f21-result.png' });
  console.log('Screenshot saved');

  const success = roomsAfter > roomsBefore;
  console.log(`\nFeature 21: ${success ? '✅ PASSING' : '❌ FAILING'}`);

  process.exit(success ? 0 : 1);

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
} finally {
  await browser.close();
}
