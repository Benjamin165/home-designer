import { chromium } from '@playwright/test';

async function main() {
  // Connect to existing browser or launch new one
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/10');
  await page.waitForTimeout(2000);

  // Find the canvas
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.log('Canvas not found');
    await browser.close();
    return;
  }

  console.log('Canvas found at:', box);

  // Calculate drag positions (center area)
  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.4;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.6;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.waitForTimeout(500);
  await page.mouse.up();

  console.log('Drag complete');
  await page.waitForTimeout(2000);

  // Screenshot
  await page.screenshot({ path: 'after-drag.png' });
  console.log('Screenshot saved');

  await browser.close();
}

main().catch(console.error);
