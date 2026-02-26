import { chromium } from 'playwright';

async function testFeature21() {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });
  const context = await browser.newContext({
    viewport: null
  });
  const page = await context.newPage();

  // Navigate to the project
  await page.goto('http://localhost:5173/editor/12');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Page loaded');

  // Click Draw Wall button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);
  console.log('Draw Wall tool selected');

  // Take initial screenshot
  await page.screenshot({ path: 'f21-before-drag.png' });

  // Get canvas position
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    console.log('Canvas not found');
    await browser.close();
    return;
  }

  // Calculate drag positions (center of canvas)
  const startX = box.x + box.width * 0.35;
  const startY = box.y + box.height * 0.35;
  const endX = box.x + box.width * 0.65;
  const endY = box.y + box.height * 0.65;

  console.log(`Canvas: ${box.width}x${box.height} at (${box.x}, ${box.y})`);
  console.log(`Dragging from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${endY.toFixed(0)})`);

  // Start drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(200);

  // Move partway
  const midX = startX + (endX - startX) * 0.5;
  const midY = startY + (endY - startY) * 0.5;
  await page.mouse.move(midX, midY, { steps: 5 });
  await page.waitForTimeout(300);

  // Screenshot during drag to see dimensions
  await page.screenshot({ path: 'f21-during-drag.png' });
  console.log('During drag screenshot taken');

  // Continue to end
  await page.mouse.move(endX, endY, { steps: 5 });
  await page.waitForTimeout(300);

  // Screenshot before release
  await page.screenshot({ path: 'f21-before-release.png' });
  console.log('Before release screenshot taken');

  // Release mouse
  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Screenshot after release
  await page.screenshot({ path: 'f21-after-release.png' });
  console.log('After release screenshot taken');

  // Check for room in UI
  const snapshot = await page.locator('body').textContent();
  const hasRoomText = snapshot.includes('Room') || snapshot.includes('room');
  console.log('Room text found:', hasRoomText);

  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('Test complete');
}

testFeature21().catch(console.error);
