const { chromium } = require('playwright');

async function dumpFixed() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    await page.click('text=Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(3000);

    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    console.log('Right-clicking...');
    await page.mouse.click(box.x + 200, box.y + 200, { button: 'right' });
    await page.waitForTimeout(1500);

    // Dump ALL fixed position elements
    const allFixed = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter(el => window.getComputedStyle(el).position === 'fixed')
        .map(el => ({
          tag: el.tagName,
          id: el.id,
          className: el.className,
          textContent: el.textContent?.substring(0, 200),
          innerHTML: el.innerHTML.substring(0, 200),
          left: window.getComputedStyle(el).left,
          top: window.getComputedStyle(el).top,
          zIndex: window.getComputedStyle(el).zIndex,
          display: window.getComputedStyle(el).display
        }));
    });

    console.log('\\n=== ALL FIXED POSITION ELEMENTS ===');
    console.log(JSON.stringify(allFixed, null, 2));

    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

dumpFixed();
