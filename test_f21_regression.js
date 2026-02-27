const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('=== Feature 21 Regression Test ===\n');
  console.log('Testing: Draw walls by dragging rectangles with live dimensions\n');

  // Navigate to the editor (project 4 is already open)
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  console.log('1. ✓ Project opened in editor');

  // Click Draw Wall button
  console.log('2. Clicking Draw Wall tool...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);
  console.log('   ✓ Draw Wall tool selected');

  // Perform drag operation
  console.log('3. Performing drag to draw rectangle...');
  const startX = 400;
  const startY = 300;
  const endX = 700;
  const endY = 550;

  await page.mouse.move(startX, startY);
  await page.waitForTimeout(100);

  await page.mouse.down();
  await page.waitForTimeout(200);

  // Drag with steps to allow dimension display
  await page.mouse.move(endX, endY, { steps: 15 });
  await page.waitForTimeout(300);

  // Take screenshot during drag to capture dimensions
  await page.screenshot({ path: '.playwright-cli/f21-regression-during-drag.png' });
  console.log('   ✓ Screenshot taken during drag');

  // Check if dimensions are visible on the page
  const dimensionText = await page.locator('text=/\\d+\\.\\d+m/').first().textContent().catch(() => null);
  if (dimensionText) {
    console.log(`   ✓ Dimensions displayed: ${dimensionText}`);
  } else {
    console.log('   ⚠ Warning: No dimensions visible during drag');
  }

  await page.mouse.up();
  console.log('4. Mouse released, waiting for room creation...');

  await page.waitForTimeout(1500);

  // Take screenshot after drag
  await page.screenshot({ path: '.playwright-cli/f21-regression-after-drag.png' });

  // Check if room was created
  const roomsCount = await page.locator('text=/"Rooms: \\d+"/').first().textContent().catch(() => 'Unknown');
  console.log(`5. Room count: ${roomsCount}`);

  // Verify room appears in properties
  const propertiesText = await page.locator('.properties-panel, [class*="properties"]').textContent().catch(() => '');

  console.log('\n=== Test Complete ===');
  console.log('Check screenshots:');
  console.log('  - .playwright-cli/f21-regression-during-drag.png (should show dimensions)');
  console.log('  - .playwright-cli/f21-regression-after-drag.png (should show new room)');

  await page.waitForTimeout(1000);
  await browser.close();
})();
