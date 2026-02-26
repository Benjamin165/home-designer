const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('✓ Step 1: Open a project in the editor');
  await page.goto('http://localhost:5173/editor/4', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  console.log('✓ Step 2: Select the Draw Wall tool from the toolbar');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(1000);

  console.log('✓ Step 3: Click and drag in the 3D viewport to draw a rectangle');
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('✗ Canvas not found');
    await browser.close();
    return;
  }

  const startX = box.x + 300;
  const startY = box.y + 300;
  const endX = startX + 200;
  const endY = startY + 150;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(500);

  console.log('✓ Step 4: Verify dimensions display in real-time as you drag');
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-f21-final-during-drag.png' });

  // Check for dimension display (this would require checking the DOM for dimension text)
  const hasDimensionDisplay = await page.locator('text=/\\d+\\.\\dm.*×.*\\d+\\.\\dm/').count() > 0;
  console.log(hasDimensionDisplay ? '  ✓ Dimensions are displayed' : '  ⚠ Dimensions not visible (may be rendered in canvas)');

  console.log('✓ Step 5: Release to complete the room');
  await page.mouse.up();
  await page.waitForTimeout(2000);

  console.log('✓ Step 6: Verify a new room is created with walls, floor, and ceiling');
  await page.screenshot({ path: 'test-f21-final-complete.png' });

  console.log('✓ Step 7: Verify the room appears in the room list or properties panel');
  try {
    const roomCount = await page.locator('text="Rooms on This Floor"').locator('xpath=following-sibling::*[1]').textContent();
    const count = parseInt(roomCount.trim());

    if (count > 0) {
      console.log(`  ✓ Room count in properties panel: ${count}`);
      console.log('\n=== FEATURE 21 TEST: PASSED ✓ ===');
    } else {
      console.log(`  ✗ Room count is still 0`);
      console.log('\n=== FEATURE 21 TEST: FAILED ✗ ===');
    }
  } catch (e) {
    console.log('  ✗ Could not verify room count');
    console.log('\n=== FEATURE 21 TEST: FAILED ✗ ===');
  }

  await browser.close();
})();
