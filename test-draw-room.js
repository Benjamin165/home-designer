// Script to test drawing a room with drag operation
import puppeteer from 'puppeteer';

async function testDrawRoom() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222'
  }).catch(() => null);

  if (!browser) {
    // Connect to a new browser instead
    const newBrowser = await puppeteer.launch({ headless: false });
    const page = await newBrowser.newPage();
    await page.goto('http://localhost:5173/editor/10');
    await performDrag(page);
    await newBrowser.close();
  } else {
    const pages = await browser.pages();
    const page = pages[0];
    await performDrag(page);
  }
}

async function performDrag(page) {
  // Wait for the page to load
  await page.waitForTimeout(1000);

  // Get viewport dimensions to calculate center area
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
    return;
  }

  // Calculate drag coordinates (center of viewport, drag to create ~4m x 3m room)
  const startX = viewport.x + viewport.width / 2;
  const startY = viewport.y + viewport.height / 2;
  const endX = startX + 200; // pixels
  const endY = startY + 150; // pixels

  console.log(`Starting drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

  // Perform the drag operation
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Move slowly to see the dimension feedback
  await page.mouse.move(endX, endY, { steps: 10 });
  await page.waitForTimeout(500);

  await page.mouse.up();

  console.log('Drag completed');

  // Wait a moment for the room to be created
  await page.waitForTimeout(1000);

  // Take a screenshot
  await page.screenshot({ path: 'room-created.png' });
  console.log('Screenshot saved to room-created.png');
}

testDrawRoom().catch(console.error);
