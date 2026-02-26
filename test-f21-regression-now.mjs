#!/usr/bin/env node
import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });

try {
  // Navigate to editor
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForLoadState('networkidle');
  await sleep(1000);

  console.log('✓ Editor loaded');

  // Click Draw Wall button
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await sleep(500);

  console.log('✓ Draw Wall tool selected');

  // Take screenshot before drag
  await page.screenshot({ path: 'test-f21-before-drag-regression.png' });

  // Find canvas element for dragging
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found');
  }

  // Calculate drag coordinates (center-ish of viewport)
  const startX = box.x + box.width * 0.4;
  const startY = box.y + box.height * 0.4;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.6;

  console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

  // Perform drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await sleep(300);

  // Take screenshot during drag (should show dimensions)
  await page.screenshot({ path: 'test-f21-during-drag-regression.png' });
  console.log('✓ Screenshot taken during drag');

  // Move gradually to ending position
  for (let i = 1; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    await page.mouse.move(x, y);
    await sleep(50);
  }

  await sleep(300);

  // Take screenshot before release
  await page.screenshot({ path: 'test-f21-before-release-regression.png' });

  await page.mouse.up();
  await sleep(1500);

  // Take screenshot after release (should show created room)
  await page.screenshot({ path: 'test-f21-after-release-regression.png' });
  console.log('✓ Screenshot taken after release');

  // Check if room was created
  const hasRoom = await page.evaluate(() => {
    const text = document.body.textContent;
    return text.includes('Room 1') || text.match(/Rooms.*1/) || text.match(/Total Rooms.*1/);
  });

  console.log(`\n=== RESULT ===`);
  console.log(`Room created: ${hasRoom ? 'YES ✅' : 'NO ❌'}`);

  if (hasRoom) {
    console.log('✅ Feature 21: PASSING - Room was created successfully');
    process.exit(0);
  } else {
    console.log('⚠️  Feature 21: Check screenshots for visual verification');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
} finally {
  await browser.close();
}
