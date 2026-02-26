import puppeteer from 'puppeteer';

async function testRoomDrawing() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/editor/10', { waitUntil: 'networkidle0' });

  console.log('Page loaded');

  // Click the Draw Wall tool if not already active
  try {
    await page.click('button:has-text("Draw Wall")');
    console.log('Clicked Draw Wall tool');
    await page.waitForTimeout(500);
  } catch (e) {
    console.log('Could not click Draw Wall button, might already be active');
  }

  // Find the canvas element
  const canvas = await page.$('canvas');
  if (!canvas) {
    console.log('Canvas not found!');
    await browser.close();
    return;
  }

  const box = await canvas.boundingBox();
  console.log('Canvas bounding box:', box);

  // Calculate drag coordinates
  const startX = box.x + box.width * 0.35;
  const startY = box.y + box.height * 0.35;
  const endX = box.x + box.width * 0.65;
  const endY = box.y + box.height * 0.65;

  console.log(`Dragging from (${Math.round(startX)}, ${Math.round(startY)}) to (${Math.round(endX)}, ${Math.round(endY)})`);

  // Perform the drag
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.waitForTimeout(100);

  // Drag slowly to see live dimensions
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(20);
  }

  await page.waitForTimeout(300);
  await page.mouse.up();

  console.log('Drag completed');
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'room-drawn.png', fullPage: false });
  console.log('Screenshot saved to room-drawn.png');

  // Check console for any errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Get the page content to check for room in UI
  const roomCount = await page.evaluate(() => {
    const statusText = document.body.innerText;
    const match = statusText.match(/Rooms:\s*(\d+)/);
    return match ? parseInt(match[1]) : null;
  });

  console.log('Room count after draw:', roomCount);

  await browser.close();
}

testRoomDrawing().catch(console.error);
