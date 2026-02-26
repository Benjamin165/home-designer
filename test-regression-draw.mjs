import { chromium } from 'playwright';

(async () => {
  // Connect to existing browser session from playwright-cli
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const contexts = browser.contexts();
  const context = contexts[0];
  const pages = context.pages();
  const page = pages[0];

  console.log('Connected to browser, current URL:', await page.url());

  // Get viewport size for drawing
  const viewport = page.viewportSize();
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  console.log(`Drawing at center: ${centerX}, ${centerY}`);

  // Perform drag to draw a rectangle
  const startX = centerX - 100;
  const startY = centerY;
  const endX = centerX + 100;
  const endY = centerY + 80;

  // Move to start position
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(100);

  // Mouse down to start drawing
  await page.mouse.down();
  await page.waitForTimeout(300);

  // Drag to end position with steps
  await page.mouse.move(endX, endY, { steps: 30 });
  await page.waitForTimeout(500);

  // Take screenshot during drag
  await page.screenshot({ path: 'test-regression-during-drag.png' });
  console.log('Screenshot taken during drag - should show dimensions');

  // Release mouse to complete the room
  await page.mouse.up();
  await page.waitForTimeout(1500);

  // Take screenshot after release
  await page.screenshot({ path: 'test-regression-after-release.png' });
  console.log('Screenshot taken after release - should show completed room');

  console.log('Drag complete!');

  await browser.disconnect();
})();
