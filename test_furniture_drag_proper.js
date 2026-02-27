const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('Testing furniture drag and drop...');

  // Find the Modern Chair item
  const chairElement = page.locator('text=Modern Chair').locator('..').locator('..').first();

  // Find the canvas
  const canvas = page.locator('canvas').first();

  // Get bounding boxes
  const chairBox = await chairElement.boundingBox();
  const canvasBox = await canvas.boundingBox();

  if (!chairBox || !canvasBox) {
    console.error('Could not find elements');
    await browser.close();
    return;
  }

  console.log('Chair position:', chairBox);
  console.log('Canvas position:', canvasBox);

  // Use Playwright's dragTo method
  try {
    console.log('Starting drag operation with dragTo...');
    await chairElement.dragTo(canvas, {
      sourcePosition: { x: chairBox.width / 2, y: chairBox.height / 2 },
      targetPosition: { x: canvasBox.width / 2, y: canvasBox.height / 2 }
    });
    console.log('Drag operation completed!');
  } catch (error) {
    console.error('Drag operation failed:', error.message);
  }

  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: '.playwright-cli/furniture-drag-result.png' });
  console.log('Screenshot taken');

  // Check for furniture in the scene
  const content = await page.content();
  console.log('Checking for furniture placement...');

  // Check console for any errors or success messages
  page.on('console', msg => console.log('[BROWSER]', msg.text()));

  await browser.close();
})();
