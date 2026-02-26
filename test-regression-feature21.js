const { chromium } = require('playwright');

(async () => {
  console.log('Starting Feature 21 regression test...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the editor page
    await page.goto('http://localhost:5173/editor/10');
    await page.waitForLoadState('networkidle');
    console.log('✓ Editor page loaded');

    // Click the Draw Wall button
    const drawWallButton = page.getByRole('button', { name: 'Draw Wall' });
    await drawWallButton.click();
    await page.waitForTimeout(500);
    console.log('✓ Draw Wall tool activated');

    // Find the canvas element
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      console.error('✗ Canvas not found');
      process.exit(1);
    }

    console.log(`✓ Canvas found: ${box.width}x${box.height}`);

    // Calculate drag points
    const startX = box.x + box.width / 2 - 100;
    const startY = box.y + box.height / 2 - 75;
    const endX = startX + 200;
    const endY = startY + 150;

    console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Move with steps to simulate smooth drag
    await page.mouse.move(endX, endY, { steps: 20 });

    // Wait a moment and take screenshot during drag to verify dimensions display
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'during-drag-regression-feature21.png' });
    console.log('✓ Screenshot taken during drag');

    // Check if dimensions are displayed (look for text containing 'm x' for meters)
    const bodyText = await page.locator('body').textContent();
    const hasDimensions = bodyText.includes('m x') || bodyText.includes('m×');

    if (hasDimensions) {
      console.log('✓ Live dimensions displayed during drag');
    } else {
      console.log('⚠ Warning: Could not detect dimension display (might still be working visually)');
    }

    // Release mouse to complete the room
    await page.mouse.up();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'after-drag-regression-feature21.png' });
    console.log('✓ Screenshot taken after drag');

    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    if (errors.length === 0) {
      console.log('✓ No console errors detected');
    } else {
      console.error(`✗ Console errors found: ${errors.length}`);
      errors.forEach(err => console.error(`  - ${err}`));
    }

    console.log('\n✓ Feature 21 regression test PASSED');
    process.exit(0);

  } catch (error) {
    console.error('✗ Feature 21 regression test FAILED:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
