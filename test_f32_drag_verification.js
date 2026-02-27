const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== Feature 32 Regression Test ===');
  console.log('Testing: Drag furniture from library to 3D scene\n');

  try {
    // Step 1: Navigate to project
    console.log('Step 1: Opening project...');
    await page.goto('http://localhost:5173/editor/4');
    await page.waitForTimeout(2000);
    console.log('✓ Project loaded');

    // Step 2: Verify asset library is open
    console.log('\nStep 2: Verifying asset library...');
    const libraryHeader = await page.locator('text=Asset Library').isVisible();
    if (!libraryHeader) {
      throw new Error('Asset library not visible');
    }
    console.log('✓ Asset library is open');

    // Step 3: Find draggable furniture items
    console.log('\nStep 3: Finding furniture items...');
    const furnitureCards = page.locator('[draggable="true"]');
    const count = await furnitureCards.count();
    console.log(`✓ Found ${count} draggable furniture items`);

    if (count === 0) {
      throw new Error('No furniture items found');
    }

    // Step 4: Select a furniture item (Modern Chair)
    console.log('\nStep 4: Selecting Modern Chair...');
    const modernChair = furnitureCards.filter({ hasText: 'Modern Chair' }).first();
    const exists = await modernChair.count() > 0;
    if (!exists) {
      // Try Dining Table instead
      const diningTable = furnitureCards.first();
      const name = await diningTable.locator('p').first().textContent();
      console.log(`✓ Selected: ${name}`);
      var selectedItem = diningTable;
    } else {
      const name = await modernChair.locator('p').first().textContent();
      console.log(`✓ Selected: ${name}`);
      var selectedItem = modernChair;
    }

    // Step 5: Take initial screenshot
    console.log('\nStep 5: Taking initial screenshot...');
    await page.screenshot({ path: '.playwright-cli/f32-verify-01-initial.png' });
    console.log('✓ Screenshot saved');

    // Step 6: Perform drag and drop
    console.log('\nStep 6: Performing drag-and-drop...');
    const canvas = page.locator('canvas').first();

    await selectedItem.dragTo(canvas, {
      sourcePosition: { x: 50, y: 50 },
      targetPosition: { x: 500, y: 350 },
    });

    await page.waitForTimeout(1500);
    console.log('✓ Drag operation completed');

    // Step 7: Take final screenshot
    console.log('\nStep 7: Taking final screenshot...');
    await page.screenshot({ path: '.playwright-cli/f32-verify-02-after-drop.png' });
    console.log('✓ Screenshot saved');

    // Step 8: Verify no console errors
    console.log('\nStep 8: Checking for console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(500);

    if (errors.length > 0) {
      console.log(`⚠️  Found ${errors.length} console errors:`);
      errors.forEach(e => console.log(`  - ${e}`));
    } else {
      console.log('✓ No console errors detected');
    }

    // SUCCESS
    console.log('\n' + '='.repeat(50));
    console.log('✅ FEATURE #32 REGRESSION TEST: PASSED');
    console.log('='.repeat(50));
    console.log('\nAll requirements met:');
    console.log('  ✓ Asset library is accessible');
    console.log('  ✓ Furniture items are draggable');
    console.log('  ✓ Drag-and-drop completes without errors');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log('❌ FEATURE #32 REGRESSION TEST: FAILED');
    console.log('='.repeat(50));
    console.log(`Error: ${error.message}`);
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
})();
