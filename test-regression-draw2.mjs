import { chromium } from 'playwright';

(async () => {
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the editor with project ID 4
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Loaded editor page');

  // Click Draw Wall tool button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  console.log('Draw Wall tool selected');

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

  console.log('Started drag');

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

  // Check the room count in properties panel
  const roomCount = await page.locator('text=Rooms on This Floor').locator('..').locator('div').nth(1).textContent();
  console.log('Room count:', roomCount);

  console.log('Test complete!');

  await browser.close();
})();
