const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Step 1: Opening project in editor...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Click on Test Project Open
  await page.locator('text=Test Project Open').first().click();
  await page.waitForTimeout(3000);

  console.log('Step 2: Taking initial screenshot...');
  await page.screenshot({ path: 'test-f32-initial.png', fullPage: true });

  console.log('Step 3: Looking for asset library / left sidebar...');

  // Look for asset library or sidebar toggle
  const sidebarElements = await page.locator('[class*="sidebar"], [class*="asset"], [class*="library"]').all();
  console.log('Found sidebar elements:', sidebarElements.length);

  // Check if there's a toggle button for the left sidebar
  const buttons = await page.locator('button, [role="button"]').all();
  let libraryButton = null;

  for (const button of buttons) {
    const text = await button.textContent().catch(() => '');
    const ariaLabel = await button.getAttribute('aria-label').catch(() => '') || '';
    const title = await button.getAttribute('title').catch(() => '') || '';

    if (text.includes('Asset') || text.includes('Library') || text.includes('Furniture') ||
        ariaLabel.includes('Asset') || ariaLabel.includes('Library') || ariaLabel.includes('Furniture') ||
        title.includes('Asset') || title.includes('Library') || title.includes('Furniture')) {
      console.log('Found potential library button:', text, ariaLabel, title);
      libraryButton = button;
      break;
    }
  }

  // Try to open the library if there's a button
  if (libraryButton) {
    console.log('Step 4: Opening asset library...');
    await libraryButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-f32-library-open.png', fullPage: true });
  } else {
    console.log('Library button not found, assuming sidebar is already open');
    await page.screenshot({ path: 'test-f32-library-check.png', fullPage: true });
  }

  console.log('Step 5: Looking for furniture items in the library...');

  // Look for furniture items (they might be in a list or grid)
  const furnitureItems = await page.locator('[class*="furniture"], [class*="asset-item"], [data-furniture], img[alt*="sofa"], img[alt*="chair"], img[alt*="table"]').all();
  console.log('Found potential furniture items:', furnitureItems.length);

  let furnitureItem = null;

  // Try to find a sofa or any furniture item
  for (const item of furnitureItems) {
    const text = await item.textContent().catch(() => '');
    const alt = await item.getAttribute('alt').catch(() => '') || '';

    if (text.toLowerCase().includes('sofa') || text.toLowerCase().includes('chair') ||
        text.toLowerCase().includes('table') || alt.toLowerCase().includes('sofa') ||
        alt.toLowerCase().includes('chair') || alt.toLowerCase().includes('table')) {
      console.log('Found furniture item:', text || alt);
      furnitureItem = item;
      break;
    }
  }

  // If we didn't find specific furniture, try the first item
  if (!furnitureItem && furnitureItems.length > 0) {
    furnitureItem = furnitureItems[0];
    console.log('Using first available item');
  }

  if (furnitureItem) {
    console.log('Step 6: Dragging furniture item to viewport...');

    const itemBox = await furnitureItem.boundingBox();
    const canvas = await page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log('Item at:', itemBox);
      console.log('Canvas at:', canvasBox);

      // Calculate drag coordinates
      const startX = itemBox.x + itemBox.width / 2;
      const startY = itemBox.y + itemBox.height / 2;
      const endX = canvasBox.x + canvasBox.width / 2;
      const endY = canvasBox.y + canvasBox.height / 2;

      console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

      await page.screenshot({ path: 'test-f32-before-drag.png', fullPage: true });

      // Perform drag operation
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(500);
      await page.mouse.down();
      await page.waitForTimeout(200);
      await page.screenshot({ path: 'test-f32-drag-start.png', fullPage: true });

      // Move slowly to simulate dragging
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        await page.mouse.move(x, y);
        await page.waitForTimeout(100);
      }

      await page.screenshot({ path: 'test-f32-during-drag.png', fullPage: true });
      console.log('Step 7: Screenshot during drag (should show preview)...');

      await page.mouse.up();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-f32-after-drop.png', fullPage: true });
      console.log('Step 8: Furniture dropped');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-f32-final.png', fullPage: true });
    } else {
      console.log('Could not get bounding boxes for drag operation');
      if (!itemBox) console.log('Item box not found');
      if (!canvasBox) console.log('Canvas box not found');
    }
  } else {
    console.log('No furniture items found in library!');
    await page.screenshot({ path: 'test-f32-no-furniture.png', fullPage: true });
  }

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('URL:', page.url());

  await browser.close();
  console.log('Test completed!');
})();
