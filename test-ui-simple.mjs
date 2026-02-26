import { chromium } from 'playwright';

console.log('Starting simple UI test for Features 6 & 7...\n');

const browser = await chromium.launch({ headless: false, timeout: 60000 });
const context = await browser.newContext();
const page = await context.newPage();

// Set longer default timeout
page.setDefaultTimeout(60000);

try {
  console.log('Loading page...');
  // Don't wait for anything special, just load
  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 10000 });

  // Give it time to render
  await page.waitForTimeout(5000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: 'test-ui-loaded.png', fullPage: true });
  console.log('✓ Page loaded and screenshot saved');

  // Check if we can see any project-related elements
  const bodyText = await page.textContent('body').catch(() => '');
  console.log('Page contains "Project":', bodyText.includes('Project'));
  console.log('Page contains "New":', bodyText.includes('New'));

  await page.waitForTimeout(2000);
  await browser.close();
  console.log('✓ Test complete');

} catch (error) {
  console.error('Error:', error.message);
  await page.screenshot({ path: 'test-ui-error.png', fullPage: true }).catch(() => {});
  await browser.close();
  process.exit(1);
}
