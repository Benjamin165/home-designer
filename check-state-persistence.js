const { chromium } = require('playwright');

async function checkState() {
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

    // Check state over time
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(300);

      const hasTestText = await page.locator('text=TEST MENU').count() > 0;
      const hasAddFurniture = await page.locator('text=Add Furniture').count() > 0;
      const fixedCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).filter(el =>
          window.getComputedStyle(el).position === 'fixed'
        ).length;
      });

      console.log(`[${i * 300}ms] TEST MENU: ${hasTestText}, Add Furniture: ${hasAddFurniture}, Fixed elements: ${fixedCount}`);
    }

    await page.waitForTimeout(2000);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkState();
