/**
 * Debug script to check context menu implementation
 */

const { chromium } = require('playwright');

async function debugContextMenu() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
  });

  try {
    console.log('Opening app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    console.log('Opening project...');
    await page.click('text=Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(3000);

    // Check if ContextMenu is in the DOM
    const contextMenuExists = await page.evaluate(() => {
      return document.querySelector('[class*="context"]') !== null;
    });
    console.log('ContextMenu in DOM:', contextMenuExists);

    // Get canvas position
    const canvas = await page.locator('canvas').first();
    const box = await canvas.boundingBox();

    console.log('\nTrying right-click on canvas...');
    await page.mouse.click(box.x + 200, box.y + 200, { button: 'right' });
    await page.waitForTimeout(1000);

    // Check for any elements with common menu text
    const menuTexts = ['Add Furniture', 'View Settings', 'Properties', 'Duplicate', 'Delete'];
    console.log('\nChecking for menu items:');
    for (const text of menuTexts) {
      const count = await page.locator(`text=${text}`).count();
      console.log(`  ${text}: ${count > 0 ? 'FOUND' : 'not found'}`);
    }

    // Check for any fixed position elements (context menus are often fixed)
    const fixedElements = await page.evaluate(() => {
      const fixed = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' && style.display !== 'none';
      });
      return fixed.map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.substring(0, 50)
      }));
    });
    console.log('\nFixed position elements:', JSON.stringify(fixedElements, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'debug-context-menu.png', fullPage: true });
    console.log('\nScreenshot saved: debug-context-menu.png');

    console.log('\nWaiting 5 seconds for manual inspection...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugContextMenu();
