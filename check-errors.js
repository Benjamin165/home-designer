const { chromium } = require('playwright');

async function checkErrors() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
      console.log('[ERROR]', text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  page.on('pageerror', error => {
    console.log('[PAGE ERROR]', error.message);
    errors.push(error.message);
  });

  try {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    await page.click('text=Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(3000);

    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    console.log('\\nRight-clicking...');
    await page.mouse.click(box.x + 200, box.y + 200, { button: 'right' });
    await page.waitForTimeout(2000);

    console.log('\\nTotal errors:', errors.length);
    console.log('Total warnings:', warnings.length);

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await browser.close();
  }
}

checkErrors();
