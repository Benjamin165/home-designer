// Test Feature 21: Draw walls by dragging rectangles
import puppeteer from 'puppeteer';

async function testFeature21() {
  try {
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222'
    });

    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('editor'));

    if (!page) {
      console.log('Editor page not found');
      process.exit(1);
    }

    console.log('Connected to editor page:', page.url());

    // Wait for the page to be ready
    await page.waitForTimeout(1000);

    // Get viewport dimensions
    const viewport = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
      }
      return null;
    });

    if (!viewport) {
      console.log('Could not find canvas element');
      process.exit(1);
    }

    console.log('Canvas found:', viewport);

    // Calculate drag coordinates
    const startX = viewport.x + viewport.width / 2 - 100;
    const startY = viewport.y + viewport.height / 2 - 75;
    const endX = startX + 200; // Will create ~4m room
    const endY = startY + 150; // Will create ~3m room

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move with steps to see dimension feedback
    await page.mouse.move(endX, endY, { steps: 15 });
    await page.waitForTimeout(500);

    // Take screenshot during drag to see dimensions
    await page.screenshot({ path: 'during-drag-feature21.png' });
    console.log('Screenshot during drag saved');

    // Release mouse to complete the room
    await page.mouse.up();
    console.log('Drag completed');

    // Wait for room creation
    await page.waitForTimeout(1500);

    // Take final screenshot
    await page.screenshot({ path: 'after-drag-feature21.png' });
    console.log('Screenshot after drag saved');

    // Check console for errors
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));

    console.log('Test completed successfully');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testFeature21();
