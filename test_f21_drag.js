const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const page = contexts[0].pages()[0];

  console.log('Current URL:', await page.url());

  // Perform drag operation to draw a room
  console.log('Starting drag...');
  await page.mouse.move(640, 400);
  await page.mouse.down();

  // Drag with steps to simulate real movement
  await page.mouse.move(800, 550, { steps: 20 });

  // Wait a bit to see dimensions
  await new Promise(r => setTimeout(r, 500));

  console.log('Taking screenshot during drag...');
  await page.screenshot({ path: 'f21-during-drag.png' });

  await page.mouse.up();
  console.log('Drag completed');

  // Wait for room to be created
  await new Promise(r => setTimeout(r, 1000));

  console.log('Taking final screenshot...');
  await page.screenshot({ path: 'f21-after-drag.png' });

  await browser.close();
})();
