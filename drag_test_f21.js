const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0];

  // Find the canvas/viewport element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    // Calculate drag coordinates (center of viewport)
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.4;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.7;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move slowly to allow dimensions to display
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(200);

    // Take screenshot BEFORE releasing mouse to see dimensions
    await page.screenshot({ path: '.playwright-cli/drag-during.png' });
    console.log('Screenshot during drag saved');

    await page.mouse.up();
    console.log('Drag completed');

    // Take screenshot after drag
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.playwright-cli/drag-result.png' });
    console.log('Screenshot after drag saved');
  }

  await browser.close();
})();
