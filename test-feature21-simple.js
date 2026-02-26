// Simple test for Feature 21 using existing browser session
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222'
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('editor'));

  if (!page) {
    console.log('Editor page not found');
    process.exit(1);
  }

  console.log('Testing Feature 21: Draw walls by dragging');

  // Method 1: Try pointer events on canvas
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
        isPrimary: true
      });
    };

    // Calculate drag positions
    const startX = rect.left + rect.width * 0.4;
    const startY = rect.top + rect.height * 0.4;
    const endX = rect.left + rect.width * 0.6;
    const endY = rect.top + rect.height * 0.6;

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

  console.log('Pointer events result:', result);

  // Take screenshots
  await page.screenshot({ path: 'feature21-test.png' });
  console.log('Screenshot saved: feature21-test.png');

  if (result.roomCount > 0) {
    console.log(`\n✅ Feature 21 PASSING - ${result.roomCount} room(s) found`);
  } else {
    console.log('\n❌ Feature 21 FAILING - No rooms created');
  }

  process.exit(result.roomCount > 0 ? 0 : 1);
})();
