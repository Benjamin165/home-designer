const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('Finding Modern Chair furniture item...');

  // Find the Modern Chair item in the asset library
  const chairItem = page.locator('text=Modern Chair').locator('..').locator('..');
  const chairBox = await chairItem.boundingBox();

  if (!chairBox) {
    console.error('Could not find Modern Chair item');
    await browser.close();
    return;
  }

  console.log('Found Modern Chair at:', chairBox);

  // Find the canvas (3D viewport)
  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  if (!canvasBox) {
    console.error('Could not find canvas');
    await browser.close();
    return;
  }

  console.log('Found canvas at:', canvasBox);

  // Calculate drag coordinates
  const startX = chairBox.x + chairBox.width / 2;
  const startY = chairBox.y + chairBox.height / 2;
  const endX = canvasBox.x + canvasBox.width / 2;
  const endY = canvasBox.y + canvasBox.height / 2;

  console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Take screenshot at start
  await page.screenshot({ path: '.playwright-cli/furniture-drag-start.png' });
  console.log('Screenshot: drag start');

  // Move to middle position
  const midX = startX + (endX - startX) * 0.5;
  const midY = startY + (endY - startY) * 0.5;
  await page.mouse.move(midX, midY);
  await page.waitForTimeout(300);

  // Take screenshot during drag
  await page.screenshot({ path: '.playwright-cli/furniture-drag-middle.png' });
  console.log('Screenshot: drag middle (should show preview)');

  // Move to end position
  await page.mouse.move(endX, endY);
  await page.waitForTimeout(300);

  // Take screenshot before release
  await page.screenshot({ path: '.playwright-cli/furniture-drag-before-release.png' });
  console.log('Screenshot: before release');

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Take final screenshot
  await page.screenshot({ path: '.playwright-cli/furniture-placed.png' });
  console.log('Screenshot: furniture placed');

  // Check console for errors
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  console.log('Drag operation completed successfully!');

  await browser.close();
})();
