const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');

  // Draw Wall tool should already be selected
  await page.waitForTimeout(1000);

  // Get the canvas element (Three.js viewport)
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('Canvas not found');
    await browser.close();
    return;
  }

  // Define drag coordinates (center of viewport, drag to bottom-right)
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + 150;
  const endY = startY + 100;

  console.log('Starting drag from', startX, startY, 'to', endX, endY);

  // Take screenshot before drag
  await page.screenshot({ path: 'test-f21-before-drag.png' });

  // Perform the drag operation
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Take screenshot during drag
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-f21-during-drag.png' });

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Take screenshot after release
  await page.screenshot({ path: 'test-f21-after-release.png' });

  // Check if room was created (check the statistics in properties panel)
  const roomsOnFloor = await page.getByText('Rooms on This Floor').locator('..').locator('..').textContent();
  console.log('Rooms on floor text:', roomsOnFloor);

  console.log('Test complete');
  await browser.close();
})();
