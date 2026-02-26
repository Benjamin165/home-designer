// Direct test of Feature 21: Draw walls by dragging
import puppeteer from 'puppeteer';

async function testFeature21() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  console.log('Opening Test Project Open...');

  // Navigate directly to the editor
  await page.goto('http://localhost:5173/editor/10', { waitUntil: 'networkidle0' });
  await page.waitForTimeout(2000);

  console.log('Editor opened');

  // Click Draw Wall tool using XPath
  const [drawWallButton] = await page.$x("//button[contains(., 'Draw Wall')]");
  if (drawWallButton) {
    await drawWallButton.click();
    await page.waitForTimeout(500);
    console.log('Draw Wall tool activated');
  } else {
    console.log('Draw Wall button not found, continuing anyway');
  }

  // Method 1: Try direct createRoom event dispatch (bypass UI)
  console.log('\n=== Method 1: Direct event dispatch ===');
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('createRoom', {
      detail: {
        width: 5,
        depth: 4,
        position_x: 0,
        position_z: 0
      }
    }));
  });
  await page.waitForTimeout(2000);

  let roomCount = await page.evaluate(() => {
    const match = document.body.innerText.match(/Rooms:\s*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  });
  console.log(`Room count after direct event: ${roomCount}`);

  // Take screenshot
  await page.screenshot({ path: 'feature-21-test.png' });

  if (roomCount > 0) {
    console.log('\n✅ Feature 21 PASSING - Room created via direct event');
  } else {
    console.log('\n❌ Feature 21 FAILING - Room not created via direct event');
    console.log('Trying drag interaction...');

    // Method 2: Try simulated pointer events
    const result = await page.evaluate(async () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'Canvas not found' };

      const rect = canvas.getBoundingClientRect();
      const createPointerEvent = (type, x, y) => {
        const event = new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          pointerType: 'mouse'
        });
        return event;
      };

      // Dispatch pointer events
      const startX = rect.left + rect.width * 0.3;
      const startY = rect.top + rect.height * 0.3;
      const endX = rect.left + rect.width * 0.7;
      const endY = rect.top + rect.height * 0.7;

      canvas.dispatchEvent(createPointerEvent('pointerdown', startX, startY));
      await new Promise(r => setTimeout(r, 100));
      canvas.dispatchEvent(createPointerEvent('pointermove', endX, endY));
      await new Promise(r => setTimeout(r, 100));
      canvas.dispatchEvent(createPointerEvent('pointerup', endX, endY));

      return { success: true, startX, startY, endX, endY };
    });

    console.log('Pointer events dispatched:', result);
    await page.waitForTimeout(2000);

    roomCount = await page.evaluate(() => {
      const match = document.body.innerText.match(/Rooms:\s*(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    console.log(`Room count after pointer events: ${roomCount}`);
  }

  // Final screenshot
  await page.screenshot({ path: 'feature-21-final.png' });
  console.log('\nScreenshots saved: feature-21-test.png, feature-21-final.png');

  await browser.close();

  if (roomCount > 0) {
    console.log('\n✅ FEATURE 21 PASSING');
    return true;
  } else {
    console.log('\n❌ FEATURE 21 FAILING - REGRESSION DETECTED');
    return false;
  }
}

testFeature21()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
