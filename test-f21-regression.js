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
  await page.screenshot({ path: 'test-f21-initial.png', fullPage: true });

  console.log('Step 3: Looking for Draw Wall tool...');

  // Try to find the Draw Wall button (might be in toolbar)
  const drawButtons = await page.locator('button, [role="button"]').all();
  let drawWallButton = null;

  for (const button of drawButtons) {
    const text = await button.textContent().catch(() => '');
    const ariaLabel = await button.getAttribute('aria-label').catch(() => '') || '';
    const title = await button.getAttribute('title').catch(() => '') || '';

    if (text.includes('Draw') || text.includes('Wall') ||
        ariaLabel.includes('Draw') || ariaLabel.includes('Wall') ||
        title.includes('Draw') || title.includes('Wall')) {
      console.log('Found potential Draw Wall button:', text, ariaLabel, title);
      drawWallButton = button;
      break;
    }
  }

  if (drawWallButton) {
    console.log('Step 4: Clicking Draw Wall tool...');
    await drawWallButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-f21-tool-selected.png', fullPage: true });
  } else {
    console.log('Draw Wall tool not found. Taking screenshot of available tools...');
    await page.screenshot({ path: 'test-f21-no-tool.png', fullPage: true });
  }

  console.log('Step 5: Attempting to draw a room by dragging...');

  // Find the 3D viewport area (canvas)
  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  if (canvasBox) {
    console.log('Canvas found at:', canvasBox);

    // Calculate drag coordinates (from center-left to center-right area)
    const startX = canvasBox.x + canvasBox.width * 0.3;
    const startY = canvasBox.y + canvasBox.height * 0.5;
    const endX = canvasBox.x + canvasBox.width * 0.7;
    const endY = canvasBox.y + canvasBox.height * 0.7;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform drag operation with mouse down, move, up
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-f21-before-drag.png', fullPage: true });

    await page.mouse.down();
    await page.waitForTimeout(200);
    await page.screenshot({ path: 'test-f21-mouse-down.png', fullPage: true });

    // Move slowly to simulate dragging
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(100);
    }

    await page.screenshot({ path: 'test-f21-during-drag.png', fullPage: true });
    console.log('Step 6: Taking screenshot during drag (should show live dimensions)...');

    await page.mouse.up();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-f21-after-release.png', fullPage: true });
    console.log('Step 7: Room drawing completed');

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-f21-final.png', fullPage: true });
  } else {
    console.log('Canvas not found!');
  }

  console.log('Step 8: Checking console for errors...');
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(msg.text()));

  // Get final page state
  await page.screenshot({ path: 'test-f21-complete.png', fullPage: true });

  console.log('\n=== VERIFICATION SUMMARY ===');
  console.log('URL:', page.url());
  console.log('Console messages captured:', consoleMessages.length);

  await browser.close();
  console.log('Test completed!');
})();
