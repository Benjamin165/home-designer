// Test Feature 21 with console logging
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DEBUG') || text.includes('createRoom') || text.includes('handlePointer')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  // Navigate to the editor
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  console.log('Clicking Draw Wall button...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  // Find the viewport - use the main canvas/renderer area
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (box) {
    const startX = box.x + 200;
    const startY = box.y + 200;
    const endX = box.x + 400;
    const endY = box.y + 400;

    console.log(`Starting drag at (${startX}, ${startY})`);
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(500);

    console.log(`Moving to (${endX}, ${endY})`);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(500);

    console.log('Releasing mouse...');
    await page.mouse.up();
    await page.waitForTimeout(2000);

    console.log('Checking room count...');
    try {
      const roomsText = await page.locator('text="Rooms on This Floor"').locator('xpath=following-sibling::*[1]').textContent();
      console.log(`Result: Rooms on This Floor = ${roomsText}`);
    } catch (e) {
      console.log('Could not read room count');
    }
  }

  await browser.close();
})();
