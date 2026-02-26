const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];

  // Get the Modern Chair element and viewport bounds
  const chairElement = page.locator('div').filter({ hasText: /^Modern Chair/ }).first();
  const chairBox = await chairElement.boundingBox();

  // Get viewport center for drop target
  const viewportSize = page.viewportSize();
  const dropX = viewportSize.width / 2 + 200; // Center-right of viewport
  const dropY = viewportSize.height / 2;

  console.log('Chair position:', chairBox);
  console.log('Drop target:', dropX, dropY);

  // Perform drag and drop
  await page.mouse.move(chairBox.x + chairBox.width / 2, chairBox.y + chairBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Take screenshot during drag
  await page.screenshot({ path: 'D:\\repos\\home-designer\\during-drag-f32.png' });
  console.log('Screenshot during drag saved');

  await page.mouse.move(dropX, dropY);
  await page.waitForTimeout(200);
  await page.mouse.up();

  await page.waitForTimeout(500);

  // Take screenshot after drop
  await page.screenshot({ path: 'D:\\repos\\home-designer\\after-drop-f32.png' });
  console.log('Screenshot after drop saved');

  await browser.close();
})();
