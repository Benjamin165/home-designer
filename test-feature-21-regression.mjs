import { chromium } from 'playwright';

async function testFeature21() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Opening Test Project Open (ID: 4)...');
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  console.log('Clicking Draw Wall button...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(1000);

  // Dismiss the modal by pressing Escape or clicking outside
  console.log('Dismissing modal...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Take screenshot before drag
  await page.screenshot({ path: 'f21-before-drag.png' });
  console.log('Screenshot saved: f21-before-drag.png');

  // Get canvas element
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  console.log('Canvas position:', box);

  // Calculate drag coordinates (center area)
  const startX = box.x + box.width * 0.35;
  const startY = box.y + box.height * 0.40;
  const endX = box.x + box.width * 0.65;
  const endY = box.y + box.height * 0.65;

  console.log(`Dragging from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${endY.toFixed(0)})`);

  // Perform drag operation
  await page.mouse.move(startX, startY);
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Move gradually to allow dimensions to update
  for (let i = 0; i <= 15; i++) {
    const x = startX + (endX - startX) * (i / 15);
    const y = startY + (endY - startY) * (i / 15);
    await page.mouse.move(x, y);
    await page.waitForTimeout(40);
  }

  // Take screenshot during drag (should show dimensions)
  await page.screenshot({ path: 'f21-during-drag.png' });
  console.log('Screenshot saved: f21-during-drag.png');

  // Release mouse to complete the room
  await page.mouse.up();
  await page.waitForTimeout(2000);

  // Take screenshot after drag
  await page.screenshot({ path: 'f21-after-drag.png' });
  console.log('Screenshot saved: f21-after-drag.png');

  // Check for console errors
  const logs = await page.evaluate(() => {
    const entries = performance.getEntriesByType('navigation');
    return { navigation: entries.length };
  });

  console.log('Test completed!');
  console.log('Navigation entries:', logs.navigation);

  await browser.close();
}

testFeature21().catch(console.error);
