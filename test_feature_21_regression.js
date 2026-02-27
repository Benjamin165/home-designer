const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  console.log('Clicking Draw Wall tool...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  console.log('Performing drag to draw room...');
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    // Start position
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.4;

    // End position
    const endX = box.x + box.width * 0.6;
    const endY = box.y + box.height * 0.7;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Move slowly to see dimension updates
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(30);
    }

    // Take screenshot during drag to capture dimensions
    await page.waitForTimeout(200);
    console.log('Taking screenshot during drag...');
    await page.screenshot({ path: 'f21-regression-during-drag.png' });

    await page.mouse.up();
    console.log('Drag completed');

    // Wait for room creation
    await page.waitForTimeout(1500);

    console.log('Taking final screenshot...');
    await page.screenshot({ path: 'f21-regression-final.png' });

    // Check console for errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('Console errors:', errors.length);

    // Check properties panel for room count
    const roomsText = await page.locator('text=Rooms on This Floor').locator('..').textContent();
    console.log('Rooms info:', roomsText);
  }

  await browser.close();
  console.log('Test complete');
})();
