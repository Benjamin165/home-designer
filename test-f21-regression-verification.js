const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  // Get the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  console.log('Canvas bounding box:', box);

  // Calculate drag coordinates (center area of viewport)
  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.4;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.6;

  console.log(`Drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Take screenshot before drag
  await page.screenshot({ path: 'test-f21-before-drag-regression.png' });

  // Perform the drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move to intermediate position
  await page.mouse.move(startX + (endX - startX) * 0.5, startY + (endY - startY) * 0.5);
  await page.waitForTimeout(300);

  // Take screenshot during drag to capture live dimensions
  await page.screenshot({ path: 'test-f21-during-drag-regression.png' });
  console.log('Screenshot during drag taken');

  // Complete the drag
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(300);

  // Take screenshot before release
  await page.screenshot({ path: 'test-f21-before-release-regression.png' });

  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Take screenshot after release
  await page.screenshot({ path: 'test-f21-after-release-regression.png' });
  console.log('Screenshot after release taken');

  // Check console for errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  console.log('Console errors:', errors.length);

  await page.waitForTimeout(2000);
  await browser.close();
})();
