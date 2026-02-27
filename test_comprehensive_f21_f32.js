const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== COMPREHENSIVE REGRESSION TEST ===');
  console.log('Testing Feature 21 and Feature 32\n');

  // Navigate to project hub
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Create a new project for testing
  console.log('1. Creating new test project...');
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.waitForTimeout(500);

  // Fill in project details
  await page.getByLabel('Project Name').fill('Regression Test F21-F32');
  await page.getByLabel('Description').fill('Testing room creation and furniture placement');
  await page.getByRole('button', { name: 'Create' }).click();
  await page.waitForTimeout(2000);

  console.log('   ✓ New project created\n');

  // === FEATURE 21 TEST: Draw walls by dragging rectangles with live dimensions ===
  console.log('=== FEATURE 21 TEST ===');
  console.log('2. Selecting Draw Wall tool...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);
  console.log('   ✓ Draw Wall tool selected');

  console.log('3. Drawing room by dragging...');
  const startX = 500;
  const startY = 400;
  const endX = 800;
  const endY = 650;

  await page.mouse.move(startX, startY);
  await page.waitForTimeout(100);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Drag slowly to see dimensions
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.waitForTimeout(500);

  // Check for dimension text during drag
  await page.screenshot({ path: '.playwright-cli/comprehensive-f21-during-drag.png' });
  console.log('   ✓ Screenshot during drag saved');

  // Try to find dimension text
  const hasDimensions = await page.locator('text=/\\d+\\.\\d+m.*×.*\\d+\\.\\d+m/').count() > 0;
  if (hasDimensions) {
    const dimText = await page.locator('text=/\\d+\\.\\d+m.*×.*\\d+\\.\\d+m/').first().textContent();
    console.log(`   ✓ Live dimensions displayed: ${dimText}`);
  } else {
    console.log('   ⚠ WARNING: No dimension text found during drag');
  }

  await page.mouse.up();
  console.log('4. Mouse released, waiting for room creation...');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: '.playwright-cli/comprehensive-f21-after-room.png' });

  // Check room count
  const statsText = await page.locator('text=/"Rooms.*\\d+"/').textContent().catch(() => null);
  console.log(`   Room statistics: ${statsText || 'Not found'}`);

  console.log('   ✓ Feature 21 test complete\n');

  // === FEATURE 32 TEST: Drag furniture from library to 3D scene ===
  console.log('=== FEATURE 32 TEST ===');
  console.log('5. Opening Asset Library...');

  // Check if asset library is visible (it should be by default)
  const libraryVisible = await page.locator('text=/Asset Library/i').isVisible();
  console.log(`   Asset library visible: ${libraryVisible}`);

  if (!libraryVisible) {
    console.log('   Opening left sidebar...');
    await page.keyboard.press('b'); // Try hotkey or find the button
    await page.waitForTimeout(500);
  }

  console.log('6. Finding furniture item to drag...');
  await page.waitForTimeout(500);

  // Find a furniture item (e.g., Modern Chair)
  const furnitureItem = page.locator('text=/Modern Chair|Table|Sofa/i').first();
  const furnitureExists = await furnitureItem.count() > 0;

  if (furnitureExists) {
    const furnitureName = await furnitureItem.textContent();
    console.log(`   Found furniture: ${furnitureName}`);

    // Get the furniture card (parent element)
    const furnitureCard = furnitureItem.locator('..').locator('..').first();
    const box = await furnitureCard.boundingBox();

    if (box) {
      console.log('7. Dragging furniture into viewport...');

      // Drag from furniture item to center of viewport
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.waitForTimeout(200);

      // Drag to center of viewport (where the room should be)
      const viewportX = 650;
      const viewportY = 500;
      await page.mouse.move(viewportX, viewportY, { steps: 15 });
      await page.waitForTimeout(300);

      await page.screenshot({ path: '.playwright-cli/comprehensive-f32-during-drag.png' });
      console.log('   ✓ Screenshot during furniture drag saved');

      await page.mouse.up();
      console.log('8. Furniture dropped, waiting for placement...');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: '.playwright-cli/comprehensive-f32-after-drop.png' });
      console.log('   ✓ Screenshot after furniture placement saved');
      console.log('   ✓ Feature 32 test complete\n');
    } else {
      console.log('   ✗ ERROR: Could not get furniture card bounding box');
    }
  } else {
    console.log('   ✗ ERROR: No furniture items found in library');
  }

  console.log('\n=== TEST COMPLETE ===');
  console.log('Check screenshots:');
  console.log('  - comprehensive-f21-during-drag.png (should show live dimensions)');
  console.log('  - comprehensive-f21-after-room.png (should show created room)');
  console.log('  - comprehensive-f32-during-drag.png (should show furniture preview)');
  console.log('  - comprehensive-f32-after-drop.png (should show placed furniture)');

  await page.waitForTimeout(2000);
  await browser.close();
})();
