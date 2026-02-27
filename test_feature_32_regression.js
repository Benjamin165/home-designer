const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'f32-regression-01-initial.png' });

  // Check if asset library is visible
  const assetLibrary = await page.locator('text=Asset Library').first();
  const isVisible = await assetLibrary.isVisible();

  if (!isVisible) {
    console.log('Opening asset library...');
    // Click to open if collapsed
    await page.getByRole('button', { name: 'Asset Library' }).click();
    await page.waitForTimeout(500);
  }

  console.log('Taking screenshot with library open...');
  await page.screenshot({ path: 'f32-regression-02-library.png' });

  // Find a furniture item to drag (Modern Chair)
  console.log('Finding Modern Chair in library...');
  const furnitureItem = await page.locator('text=Modern Chair').first();

  if (!await furnitureItem.isVisible()) {
    console.log('Modern Chair not visible, trying to find any furniture...');
    // Try Dining Table instead
    const diningTable = await page.locator('text=Dining Table').first();
    if (await diningTable.isVisible()) {
      console.log('Using Dining Table instead');
    }
  }

  // Get the furniture card element (parent of the text)
  const furnitureCard = await page.locator('text=Modern Chair').locator('..').locator('..').first();
  const cardBox = await furnitureCard.boundingBox();

  // Get the 3D viewport canvas
  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  if (cardBox && canvasBox) {
    console.log('Performing drag from library to viewport...');

    // Start from furniture card center
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;

    // Drop in center of viewport
    const endX = canvasBox.x + canvasBox.width / 2;
    const endY = canvasBox.y + canvasBox.height / 2;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Move slowly to see preview
    const steps = 40;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(25);
    }

    // Take screenshot during drag to capture preview
    console.log('Taking screenshot during drag...');
    await page.screenshot({ path: 'f32-regression-03-during-drag.png' });

    await page.mouse.up();
    console.log('Drag completed, furniture should be placed');

    // Wait for furniture to be added
    await page.waitForTimeout(1500);

    console.log('Taking final screenshot...');
    await page.screenshot({ path: 'f32-regression-04-final.png' });

    // Check console for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('Console errors:', errors.length);
  } else {
    console.log('Could not find furniture card or canvas');
  }

  await browser.close();
  console.log('Test complete');
})();
