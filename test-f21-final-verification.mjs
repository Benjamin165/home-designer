#!/usr/bin/env node
import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

try {
  console.log('=== Feature 21 Final Verification ===\n');

  // Step 1: Create a new project
  console.log('[Step 1] Creating new project...');
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  await sleep(1000);

  await page.getByRole('button', { name: 'New Project' }).click();
  await sleep(500);

  await page.getByRole('textbox', { name: 'Project Name *' }).fill('Feature 21 Test');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.waitForLoadState('networkidle');
  await sleep(2000);

  console.log('✓ Project created, editor opened\n');

  // Step 2: Activate Draw Wall tool
  console.log('[Step 2] Activating Draw Wall tool...');
  await page.getByRole('button', { name: 'Draw Wall' }).click();
  await sleep(500);
  console.log('✓ Draw Wall tool activated\n');

  // Step 3: Perform drag to draw room
  console.log('[Step 3] Drawing room by dragging...');
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Canvas not found');
  }

  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.6;
  const endX = box.x + box.width * 0.6;
  const endY = box.y + box.height * 0.8;

  await page.mouse.move(startX, startY);
  await sleep(200);
  await page.mouse.down();
  await sleep(300);

  // Move gradually
  for (let i = 1; i <= 10; i++) {
    const x = startX + (endX - startX) * (i / 10);
    const y = startY + (endY - startY) * (i / 10);
    await page.mouse.move(x, y);
    await sleep(50);
  }

  await sleep(500);
  await page.mouse.up();
  console.log('✓ Drag completed\n');

  await sleep(2000);

  // Step 4: Take screenshot and verify
  console.log('[Step 4] Verifying room was created...');
  await page.screenshot({ path: 'test-f21-final-result.png' });

  // Check if room appears in the properties panel or viewport
  const hasRoom = await page.evaluate(() => {
    const text = document.body.textContent;
    // Look for "Room 1" text or "Rooms: 1" or similar indicators
    return text.includes('Room 1') || text.match(/Rooms.*1/);
  });

  console.log(`✓ Screenshot saved: test-f21-final-result.png`);
  console.log(`Room detected in UI: ${hasRoom ? 'YES ✓' : 'NO ✗'}\n`);

  // Final verdict
  console.log('=== RESULT ===');
  if (hasRoom) {
    console.log('✅ Feature 21: PASSING');
    console.log('- Draw Wall tool activated successfully');
    console.log('- Drag operation completed');
    console.log('- Room was created and appears in UI');
    process.exit(0);
  } else {
    console.log('❌ Feature 21: FAILING');
    console.log('- Room may not have been created or UI not updated');
    process.exit(1);
  }

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
} finally {
  await browser.close();
}
