const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = await context.pages();
  const page = pages.find(p => p.url().includes('editor'));

  if (!page) {
    console.log('Editor page not found');
    process.exit(1);
  }

  // Find the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.log('Canvas not found');
    process.exit(1);
  }

  // Calculate drag points (center of canvas, drag to create 4m x 3m room)
  const startX = box.x + box.width / 2 - 80;
  const startY = box.y + box.height / 2 - 60;
  const endX = startX + 160;
  const endY = startY + 120;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(500); // Wait to see dimensions
  await page.screenshot({ path: 'during-drag-feature21.png' });
  console.log('Screenshot taken during drag');
  await page.mouse.up();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'after-drag-feature21.png' });
  console.log('Screenshot taken after drag');
  console.log('Drag completed');

  await browser.close();
})();
