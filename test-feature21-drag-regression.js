// Test Feature 21: Draw walls by dragging rectangles
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the editor (already open in the testing browser)
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');

  console.log('Page loaded, clicking Draw Wall button...');

  // Click Draw Wall button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  console.log('Taking before-drag screenshot...');
  await page.screenshot({ path: 'test-f21-before-drag.png' });

  // Find the viewport container - it's the main element
  const viewport = await page.locator('main').first();
  const box = await viewport.boundingBox();

  if (box) {
    // Calculate drag coordinates (center area of viewport)
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.3;
    const endX = box.x + box.width * 0.6;
    const endY = box.y + box.height * 0.6;

    console.log(`Performing drag from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})...`);

    // Perform the drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(200);

    console.log('Taking during-drag screenshot...');
    await page.screenshot({ path: 'test-f21-during-drag.png' });

    // Move to end position gradually to allow dimensions to update
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(300);

    console.log('Taking before-release screenshot...');
    await page.screenshot({ path: 'test-f21-before-release.png' });

    // Release mouse to complete the room
    await page.mouse.up();
    await page.waitForTimeout(1000);

    console.log('Taking after-release screenshot...');
    await page.screenshot({ path: 'test-f21-after-release.png' });

    // Get room count from properties panel
    try {
      const roomsText = await page.locator('text="Rooms on This Floor"').locator('xpath=following-sibling::*[1]').textContent();
      console.log(`Rooms on This Floor: ${roomsText}`);
    } catch (e) {
      console.log('Could not read room count');
    }

  } else {
    console.log('Could not find viewport element');
  }

  await browser.close();
  console.log('Test completed');
})();
