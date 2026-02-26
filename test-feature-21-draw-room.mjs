import { chromium } from 'playwright';

async function testRoomDrawing() {
  console.log('Starting room drawing test...');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the editor
    await page.goto('http://localhost:5173/editor/1');
    await page.waitForTimeout(2000);

    console.log('Page loaded, clicking Draw Wall button...');

    // Click the Draw Wall button
    await page.getByRole('button', { name: 'Draw Wall' }).click();
    await page.waitForTimeout(500);

    console.log('Draw Wall tool activated');

    // Get the canvas element
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (!box) {
      throw new Error('Canvas not found');
    }

    console.log(`Canvas found at (${box.x}, ${box.y}) with size ${box.width}x${box.height}`);

    // Calculate drag coordinates (center of canvas area, large enough to create a room > 0.5m)
    const startX = box.x + box.width * 0.3;  // 30% from left
    const startY = box.y + box.height * 0.4; // 40% from top
    const endX = box.x + box.width * 0.6;    // 60% from left (30% width)
    const endY = box.y + box.height * 0.7;   // 70% from top (30% height)

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform the drag operation
    await page.mouse.move(startX, startY);
    await page.waitForTimeout(100);

    await page.mouse.down();
    console.log('Mouse down');
    await page.waitForTimeout(200);

    // Move in steps to simulate dragging
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (endX - startX) * (i / steps);
      const y = startY + (endY - startY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(50);
    }

    console.log('Mouse moved to end position');
    await page.waitForTimeout(200);

    await page.mouse.up();
    console.log('Mouse up - room should be created');

    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ path: 'test-feature-21-result.png' });
    console.log('Screenshot saved to test-feature-21-result.png');

    // Check console for errors
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    // Check if room was created (look for toast notification or room in list)
    const toasts = await page.locator('[role="status"]').count();
    console.log(`Toast notifications: ${toasts}`);

    // Check if dimensions are displayed during drag
    console.log('\nTest completed. Check the screenshot for visual verification.');

  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'test-feature-21-error.png' });
  } finally {
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

testRoomDrawing();
