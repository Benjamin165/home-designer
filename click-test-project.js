const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);

  // Find and click on "Test Project Open"
  const projectCard = await page.locator('text=Test Project Open').first();
  await projectCard.click();

  await page.waitForTimeout(3000);

  // Take screenshot
  await page.screenshot({ path: 'test-f7-after-click.png', fullPage: true });

  // Check if we're in the editor
  const pageUrl = page.url();
  const pageTitle = await page.title();

  console.log('Page URL:', pageUrl);
  console.log('Page Title:', pageTitle);

  // Check for project name in toolbar
  const toolbar = await page.locator('[class*="toolbar"]').first().textContent().catch(() => '');
  console.log('Toolbar content:', toolbar);

  await browser.close();
})();
