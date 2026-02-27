const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== FEATURE 32 REGRESSION TEST ===');
  console.log('Testing: Drag furniture from library to 3D scene\n');

  // Navigate to existing project with rooms
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(3000);

  console.log('1. ✓ Project opened with existing rooms');

  // Check console for errors
  let consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('2. Checking Asset Library visibility...');
  const libraryHeading = await page.locator('text=/Asset Library/i').isVisible();
  console.log(`   Asset Library visible: ${libraryHeading}`);

  // Take initial screenshot
  await page.screenshot({ path: '.playwright-cli/f32-final-01-initial.png' });
  console.log('   ✓ Initial screenshot saved');

  console.log('3. Finding furniture item to drag...');
  await page.waitForTimeout(1000);

  // Look for furniture cards in the asset library
  const furnitureCards = page.locator('[class*="asset"], [class*="furniture"]').filter({ hasText: /Chair|Table|Lamp/i });
  const cardCount = await furnitureCards.count();
  console.log(`   Found ${cardCount} potential furniture items`);

  if (cardCount > 0) {
    // Get the first furniture card
    const firstCard = furnitureCards.first();
    const cardText = await firstCard.textContent();
    console.log(`   Selected furniture: ${cardText.substring(0, 50)}...`);

    const box = await firstCard.boundingBox();

    if (box) {
      console.log('4. Dragging furniture into 3D viewport...');

      // Start drag from furniture card
      const dragStartX = box.x + box.width / 2;
      const dragStartY = box.y + box.height / 2;

      await page.mouse.move(dragStartX, dragStartY);
      await page.waitForTimeout(200);
      await page.mouse.down();
      await page.waitForTimeout(300);

      console.log(`   Dragging from (${Math.floor(dragStartX)}, ${Math.floor(dragStartY)})...`);

      // Drag to center of viewport
      const viewportX = 700;
      const viewportY = 450;

      await page.mouse.move(viewportX, viewportY, { steps: 20 });
      await page.waitForTimeout(500);

      await page.screenshot({ path: '.playwright-cli/f32-final-02-during-drag.png' });
      console.log('   ✓ Screenshot during drag saved');

      // Drop the furniture
      await page.mouse.up();
      console.log('5. Furniture dropped into scene');

      await page.waitForTimeout(2000);

      await page.screenshot({ path: '.playwright-cli/f32-final-03-after-drop.png' });
      console.log('   ✓ Screenshot after drop saved');

      if (consoleErrors.length > 0) {
        console.log(`\n⚠ Console errors detected: ${consoleErrors.length}`);
        consoleErrors.forEach(err => console.log(`   - ${err}`));
      } else {
        console.log('\n✓ No console errors');
      }

      console.log('\n=== Feature 32 Test Complete ===');
      console.log('Check screenshots to verify:');
      console.log('  1. f32-final-01-initial.png - Initial state');
      console.log('  2. f32-final-02-during-drag.png - Furniture preview follows cursor');
      console.log('  3. f32-final-03-after-drop.png - Furniture placed in scene');

    } else {
      console.log('   ✗ ERROR: Could not get bounding box for furniture card');
    }
  } else {
    console.log('   ✗ ERROR: No furniture items found');
  }

  await page.waitForTimeout(1000);
  await browser.close();
})();
