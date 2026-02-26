import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages.find(p => p.url().includes('localhost:5173'));

  if (!page) {
    console.error('No page found with localhost:5173');
    process.exit(1);
  }

  // Get the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  // Calculate drag points
  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.4;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.6;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // Move slowly with multiple steps
  for (let i = 0; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    await page.mouse.move(x, y);
    await page.waitForTimeout(50);
  }

  await page.mouse.up();

  console.log('Drag completed');

  // Wait a bit and take screenshot
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'after-drag.png' });
  console.log('Screenshot saved to after-drag.png');
})();
