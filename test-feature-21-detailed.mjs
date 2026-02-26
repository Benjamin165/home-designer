import { chromium } from 'playwright';

async function testRoomDrawing() {
  console.log('Starting detailed room drawing test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('DEBUG') || text.includes('dimension') || text.includes('createRoom')) {
      console.log(`[BROWSER] ${text}`);
    }
  });

  try {
    // Navigate to the editor
    await page.goto('http://localhost:5173/editor/1');
    await page.waitForTimeout(2000);

    console.log('✓ Page loaded\n');

    // Click the Draw Wall button
    const drawButton = page.getByRole('button', { name: 'Draw Wall' });
    await drawButton.click();
    await page.waitForTimeout(500);

    console.log('✓ Draw Wall tool activated\n');

    // Take screenshot before drawing
    await page.screenshot({ path: 'test-21-before-draw.png' });
    console.log('✓ Screenshot saved: test-21-before-draw.png\n');

    // Get the canvas bounding box
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    console.log(`Canvas bounds: x=${box.x}, y=${box.y}, w=${box.width}, h=${box.height}\n`);

    // Calculate drag coordinates
    const startX = box.x + box.width * 0.4;
    const startY = box.y + box.height * 0.4;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.7;

    console.log(`Drag from: (${Math.round(startX)}, ${Math.round(startY)})`);
    console.log(`Drag to:   (${Math.round(endX)}, ${Math.round(endY)})\n`);

    // Move mouse to start position
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(200);

    console.log('✓ Mouse moved to start position');

    // Mouse down
    await page.mouse.down();
    await page.waitForTimeout(300);

    console.log('✓ Mouse down');

    // Take screenshot during drag (mouse is down, moving)
    await page.mouse.move(startX + (endX - startX) * 0.5, startY + (endY - startY) * 0.5);
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-21-during-draw.png' });
    console.log('✓ Screenshot saved: test-21-during-draw.png (mid-drag)');

    // Continue moving to end position
    await page.mouse.move(endX, endY);
    await page.waitForTimeout(300);

    console.log('✓ Mouse moved to end position');

    // Take screenshot just before mouse up
    await page.screenshot({ path: 'test-21-before-mouseup.png' });
    console.log('✓ Screenshot saved: test-21-before-mouseup.png\n');

    // Mouse up
    await page.mouse.up();
    console.log('✓ Mouse up - room should be created\n');

    await page.waitForTimeout(2000);

    // Take final screenshot
    await page.screenshot({ path: 'test-21-after-draw.png' });
    console.log('✓ Screenshot saved: test-21-after-draw.png');

    // Check for toast notifications or room creation
    const toasts = await page.locator('[role="status"]').count();
    console.log(`\nToast notifications: ${toasts}`);

    // Check rooms count in the UI
    const roomsText = await page.locator('text=/Rooms:/').textContent().catch(() => 'Not found');
    console.log(`Rooms count in UI: ${roomsText}`);

    // Look for createRoom event in console logs
    const createRoomLogs = consoleLogs.filter(log => log.includes('createRoom'));
    console.log(`\ncreatieRoom events in console: ${createRoomLogs.length}`);

    // Look for dimension updates
    const dimensionLogs = consoleLogs.filter(log => log.toLowerCase().includes('dimension'));
    console.log(`Dimension-related logs: ${dimensionLogs.length}`);

    console.log('\n✓ Test completed. Check screenshots for visual verification.');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    await page.screenshot({ path: 'test-21-error.png' });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

testRoomDrawing();
