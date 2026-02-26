const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening project...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  await page.locator('text=Test Project Open').first().click();
  await page.waitForTimeout(3000);

  console.log('Taking initial screenshot...');
  await page.screenshot({ path: 'test-f32-step1.png', fullPage: true });

  // Look for the left sidebar - it should have Asset Library
  console.log('Checking left sidebar...');

  // Try clicking on "Asset Library" text to expand it
  const assetLibraryText = await page.locator('text=Asset Library').first();
  if (assetLibraryText) {
    console.log('Found Asset Library, attempting to expand...');
    try {
      await assetLibraryText.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-f32-step2-library-expanded.png', fullPage: true });
    } catch (e) {
      console.log('Could not click Asset Library:', e.message);
    }
  }

  // Look for any furniture items or asset items in the DOM
  console.log('Searching for furniture items...');

  // Try various selectors that might contain furniture
  const possibleSelectors = [
    '[draggable="true"]',
    '[data-type="furniture"]',
    '[data-asset-id]',
    '.asset-item',
    '.furniture-item',
    'div[role="button"]'
  ];

  let foundItems = [];
  for (const selector of possibleSelectors) {
    const items = await page.locator(selector).all();
    if (items.length > 0) {
      console.log(`Found ${items.length} items with selector: ${selector}`);
      foundItems = items;
      break;
    }
  }

  // Also try looking for images in the sidebar area
  const sidebarImages = await page.locator('.left-sidebar img, [class*="sidebar"] img, [class*="asset"] img').all();
  console.log('Found sidebar images:', sidebarImages.length);

  if (sidebarImages.length > 0) {
    foundItems = sidebarImages;
  }

  if (foundItems.length > 0) {
    console.log(`Found ${foundItems.length} potential furniture items, using first one...`);
    const item = foundItems[0];

    // Get item information
    const itemHtml = await item.evaluate(el => el.outerHTML).catch(() => 'N/A');
    console.log('Item HTML:', itemHtml.substring(0, 200));

    const itemBox = await item.boundingBox();
    const canvas = await page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (itemBox && canvasBox) {
      console.log('Dragging from sidebar to viewport...');

      const startX = itemBox.x + itemBox.width / 2;
      const startY = itemBox.y + itemBox.height / 2;
      const endX = canvasBox.x + canvasBox.width / 2;
      const endY = canvasBox.y + canvasBox.height / 2;

      console.log(`From (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${endY.toFixed(0)})`);

      await page.screenshot({ path: 'test-f32-step3-before-drag.png', fullPage: true });

      await page.mouse.move(startX, startY);
      await page.waitForTimeout(300);
      await page.mouse.down();
      await page.waitForTimeout(300);

      await page.screenshot({ path: 'test-f32-step4-drag-start.png', fullPage: true });

      // Drag to viewport
      const steps = 15;
      for (let i = 1; i <= steps; i++) {
        const x = startX + (endX - startX) * (i / steps);
        const y = startY + (endY - startY) * (i / steps);
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);

        // Take a screenshot midway to capture the preview
        if (i === 7) {
          await page.screenshot({ path: 'test-f32-step5-during-drag.png', fullPage: true });
          console.log('Captured mid-drag screenshot (should show preview)');
        }
      }

      await page.mouse.up();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: 'test-f32-step6-after-drop.png', fullPage: true });
      console.log('Furniture dropped!');

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-f32-step7-final.png', fullPage: true });
    } else {
      console.log('Bounding boxes not available');
    }
  } else {
    console.log('No furniture items found with any selector');

    // Debug: dump all elements in the left sidebar
    const leftSidebar = await page.locator('[class*="left"], [class*="sidebar"]').first();
    if (leftSidebar) {
      const sidebarHtml = await leftSidebar.innerHTML().catch(() => 'N/A');
      console.log('Left sidebar HTML (first 500 chars):', sidebarHtml.substring(0, 500));
    }
  }

  await browser.close();
  console.log('Test completed');
})();
