const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening editor...');
  await page.goto('http://localhost:5173/editor/4', { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Click on Draw Wall tool
  console.log('Clicking Draw Wall tool...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  // Take initial screenshot
  await page.screenshot({ path: 'test-f21-fix-initial.png' });

  // Get the canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.error('Canvas not found');
    await browser.close();
    return;
  }

  // Define drag coordinates
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  const endX = startX + 150;
  const endY = startY + 100;

  console.log('Performing drag from', startX, startY, 'to', endX, endY);

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(500);

  await page.mouse.move(endX, endY);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-f21-fix-during-drag.png' });

  await page.mouse.up();
  await page.waitForTimeout(2000);

  // Take final screenshot
  await page.screenshot({ path: 'test-f21-fix-after-release.png' });

  // Check room count
  const propertiesPanel = await page.locator('text=Rooms on This Floor').locator('..').locator('..').textContent();
  console.log('Properties panel content:', propertiesPanel);

  // Check if room count increased
  const hasRoom = propertiesPanel.includes('Rooms on This Floor1') || propertiesPanel.includes('Total Rooms1');
  console.log('Room created:', hasRoom);

  // Check console for errors
  const logs = [];
  page.on('console', msg => logs.push(msg.text()));

  console.log('\n=== TEST RESULT ===');
  console.log('Room created:', hasRoom ? 'YES ✓' : 'NO ✗');

  await browser.close();
})();
