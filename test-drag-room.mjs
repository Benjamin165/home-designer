import { chromium } from 'playwright';

async function testDragRoom() {
  // Launch browser and navigate
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173/editor/3');
  await page.waitForTimeout(2000);

  // Perform drag operation in viewport (center area)
  console.log('Performing drag operation...');
  const startX = 500;
  const startY = 350;
  const endX = 700;
  const endY = 500;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move mouse gradually to simulate drag
  for (let i = 0; i <= 20; i++) {
    const x = startX + (endX - startX) * (i / 20);
    const y = startY + (endY - startY) * (i / 20);
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }

  await page.mouse.up();
  console.log('Drag completed');

  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'after-room-draw.png' });
  console.log('Screenshot saved as after-room-draw.png');

  await browser.close();
}

testDragRoom().catch(console.error);
