const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[pages.length - 1];

  // Find the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    // Drag from center-left to center-right to create a rectangle
    const startX = box.x + box.width * 0.35;
    const startY = box.y + box.height * 0.45;
    const endX = box.x + box.width * 0.65;
    const endY = box.y + box.height * 0.65;

    console.log('Dragging from', startX, startY, 'to', endX, endY);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(500);
    await page.mouse.up();

    console.log('Drag completed');
  }

  await browser.close();
})();
