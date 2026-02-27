const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Navigating to editor...');
  await page.goto('http://localhost:5198/editor/4');
  await page.waitForTimeout(2000);

  // Check initial state - count objects in scene
  console.log('Checking initial scene state...');
  await page.screenshot({ path: 'f32-detail-01-initial.png', fullPage: true });

  // Make sure we're in select mode first
  console.log('Clicking Select tool...');
  await page.getByRole('button', { name: 'Select / Pointer' }).click();
  await page.waitForTimeout(500);

  // Now drag furniture
  console.log('Finding Modern Chair in library...');
  const furnitureCard = await page.locator('text=Modern Chair').locator('..').locator('..').first();

  if (!await furnitureCard.isVisible()) {
    console.log('ERROR: Modern Chair not found in library!');
    await browser.close();
    return;
  }

  const cardBox = await furnitureCard.boundingBox();
  const canvas = await page.locator('canvas').first();
  const canvasBox = await canvas.boundingBox();

  if (cardBox && canvasBox) {
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = canvasBox.x + canvasBox.width / 2;
    const endY = canvasBox.y + canvasBox.height / 2 - 100; // Place a bit higher

    console.log(`Dragging from library (${Math.round(startX)}, ${Math.round(startY)}) to viewport (${Math.round(endX)}, ${Math.round(endY)})`);

    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Drag slowly
    await page.mouse.move(endX, endY, { steps: 50 });
    await page.waitForTimeout(500);

    console.log('Taking screenshot during drag...');
    await page.screenshot({ path: 'f32-detail-02-during-drag.png', fullPage: true });

    await page.mouse.up();
    console.log('Released mouse - furniture should be placed');

    // Wait for placement
    await page.waitForTimeout(2000);

    console.log('Taking final screenshot...');
    await page.screenshot({ path: 'f32-detail-03-final.png', fullPage: true });

    // Check for any toast/notification messages
    const notifications = await page.locator('[role="status"], [role="alert"], .toast, .notification').allTextContents();
    if (notifications.length > 0) {
      console.log('Notifications found:', notifications);
    }

    // Check if there are any furniture items selected or in the properties panel
    const propertiesText = await page.locator('text=Properties').locator('..').locator('..').textContent();
    console.log('Properties panel content:', propertiesText.substring(0, 200));

    console.log('\n=== Console Messages ===');
    consoleMessages.forEach(msg => console.log(msg));
  }

  await page.waitForTimeout(1000);
  await browser.close();
  console.log('\nTest complete');
})();
