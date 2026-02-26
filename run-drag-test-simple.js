const fs = require('fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Navigate to the editor
  await page.goto('http://localhost:5173/editor/4');
  await page.waitForTimeout(2000);

  console.log('Page loaded, running drag test...');

  const dragCode = fs.readFileSync('drag-room-inline.js', 'utf8');
  const result = await page.evaluate(dragCode);

  console.log('Test result:', result);

  await page.screenshot({ path: 'drag-test-result.png' });
  console.log('Screenshot saved');

  await browser.close();

  process.exit(result && result.roomCount > 0 ? 0 : 1);
})();
