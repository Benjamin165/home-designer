import { chromium } from 'playwright';

async function testFeature21() {
  const browser = await chromium.launch({
    headless: false
  });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173/editor/12');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('Page loaded');

  // Click Draw Wall button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await page.waitForTimeout(500);

  // Click somewhere to dismiss the tooltip (click on canvas area outside the tooltip)
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();

  // Click on left side of canvas to dismiss tooltip
  await page.mouse.click(box.x + 100, box.y + 100);
  await page.waitForTimeout(500);

  console.log('Tooltip dismissed');
  await page.screenshot({ path: 'f21-tooltip-dismissed.png' });

  // Now perform the drag
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.3;
  const endX = box.x + box.width * 0.7;
  const endY = box.y + box.height * 0.7;

  console.log(`Dragging from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${endY.toFixed(0)})`);

  // Start drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move to midpoint
  const midX = startX + (endX - startX) * 0.5;
  const midY = startY + (endY - startY) * 0.5;
  await page.mouse.move(midX, midY, { steps: 10 });
  await page.waitForTimeout(500);

  // Take screenshot during drag - dimensions should be visible
  await page.screenshot({ path: 'f21-mid-drag-dimensions.png' });
  console.log('Mid-drag screenshot with dimensions taken');

  // Move to end position
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(500);

  // Take screenshot before release
  await page.screenshot({ path: 'f21-end-drag-dimensions.png' });
  console.log('End-drag screenshot with dimensions taken');

  // Release
  await page.mouse.up();
  await page.waitForTimeout(1500);

  // Take final screenshot
  await page.screenshot({ path: 'f21-room-created.png' });
  console.log('Room created screenshot taken');

  // Check if room appears in properties panel or room list
  const propertiesText = await page.locator('text=/Properties/i').count();
  const roomText = await page.locator('text=/Room/i').count();

  console.log('Properties sections:', propertiesText);
  console.log('Room mentions:', roomText);

  // Get all text content to check for room details
  const bodyText = await page.locator('body').textContent();
  const hasFloor = bodyText.includes('Floor') || bodyText.includes('floor');
  const hasCeiling = bodyText.includes('Ceiling') || bodyText.includes('ceiling');
  const hasWall = bodyText.includes('Wall') || bodyText.includes('wall');

  console.log('Has Floor reference:', hasFloor);
  console.log('Has Ceiling reference:', hasCeiling);
  console.log('Has Wall reference:', hasWall);

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('Test complete');
}

testFeature21().catch(console.error);
