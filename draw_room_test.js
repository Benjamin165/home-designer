const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
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
    // Calculate center positions for the drag
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.4;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.7;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move slowly to see dimension updates
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(50);
    }

    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Take a screenshot
    await page.screenshot({ path: '.playwright-cli/room-drawn.png' });
    console.log('Room drawn successfully!');

    // Get the page content to check for room
    const roomCount = await page.locator('text="Rooms: "').textContent();
    console.log('Room count:', roomCount);
  }

  await browser.close();
})();
