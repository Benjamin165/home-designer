const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');

  // Click Draw Wall button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  // Find the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.3;
    const endX = box.x + box.width * 0.6;
    const endY = box.y + box.height * 0.6;

    console.log('Starting drag operation...');

    // Start drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(200);

    // Move to middle position and check for dimension display
    const midX = startX + (endX - startX) * 0.5;
    const midY = startY + (endY - startY) * 0.5;
    await page.mouse.move(midX, midY);
    await page.waitForTimeout(300);

    // Take screenshot during drag
    await page.screenshot({ path: '.playwright-cli/dimension-display-during-drag.png' });
    console.log('Screenshot taken during drag');

    // Check for dimension text in the page
    const pageContent = await page.content();
    const hasDimension = pageContent.includes('×') || pageContent.includes('m ×') || pageContent.match(/\d+\.\d+m/);
    console.log('Has dimension text:', hasDimension);

    // Continue to end position
    await page.mouse.move(endX, endY);
    await page.waitForTimeout(200);

    // Take another screenshot just before release
    await page.screenshot({ path: '.playwright-cli/dimension-display-before-release.png' });
    console.log('Screenshot taken before release');

    // Release mouse
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Final screenshot
    await page.screenshot({ path: '.playwright-cli/room-created-final.png' });
    console.log('Final screenshot taken');

    // Check room count
    const roomText = await page.locator('text=/Rooms: \\d+/').textContent();
    console.log('Room count:', roomText);
  }

  await browser.close();
})();
