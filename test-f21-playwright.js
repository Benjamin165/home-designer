const { chromium } = require('playwright');

(async () => {
  let browser;
  let isOwnBrowser = false;

  try {
    // Try to connect to existing browser first
    browser = await chromium.connectOverCDP('http://localhost:9222');
  } catch (e) {
    // If can't connect, launch our own
    browser = await chromium.launch({ headless: false });
    isOwnBrowser = true;
  }

  const contexts = browser.contexts();
  const context = contexts[0] || await browser.newContext();
  const pages = context.pages();
  let page = pages.find(p => p.url().includes('editor'));

  if (!page) {
    page = await context.newPage();
    await page.goto('http://localhost:5173');
  }

  console.log('Testing Feature 21: Draw walls by dragging');
  console.log('Current URL:', page.url());

  // Execute the drag test
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'Canvas not found' };

    const rect = canvas.getBoundingClientRect();
    const createPointerEvent = (type, x, y) => {
      return new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: type === 'pointermove' ? 1 : 0
      });
    };

    // Calculate drag positions
    const startX = rect.left + rect.width * 0.4;
    const startY = rect.top + rect.height * 0.4;
    const endX = rect.left + rect.width * 0.6;
    const endY = rect.top + rect.height * 0.6;

    console.log(`Canvas bounds: ${rect.left}, ${rect.top}, ${rect.width}x${rect.height}`);
    console.log(`Dragging from ${startX}, ${startY} to ${endX}, ${endY}`);

    // Dispatch pointer events
    canvas.dispatchEvent(createPointerEvent('pointerdown', startX, startY));
    await new Promise(r => setTimeout(r, 100));

    // Move in steps to simulate drag
    for (let i = 1; i <= 10; i++) {
      const x = startX + (endX - startX) * (i / 10);
      const y = startY + (endY - startY) * (i / 10);
      canvas.dispatchEvent(createPointerEvent('pointermove', x, y));
      await new Promise(r => setTimeout(r, 30));
    }

    await new Promise(r => setTimeout(r, 500));
    canvas.dispatchEvent(createPointerEvent('pointerup', endX, endY));

    await new Promise(r => setTimeout(r, 1500));

    // Check room count
    const match = document.body.innerText.match(/Rooms:\s*(\d+)/);
    const roomCount = match ? parseInt(match[1]) : 0;

    return { success: true, startX, startY, endX, endY, roomCount };
  });

  console.log('Result:', result);

  await page.screenshot({ path: 'feature21-playwright-test.png' });
  console.log('Screenshot saved: feature21-playwright-test.png');

  if (result.roomCount > 0) {
    console.log(`\n✅ Feature 21 PASSING - ${result.roomCount} room(s) found`);
  } else {
    console.log('\n❌ Feature 21 FAILING - No rooms created');
  }

  if (isOwnBrowser) {
    await browser.close();
  }

  process.exit(result.roomCount > 0 ? 0 : 1);
})();
