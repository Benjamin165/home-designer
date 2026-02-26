/**
 * Check actual DOM structure after right-click
 */

const { chromium } = require('playwright');

async function checkDOM() {
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

    console.log('Right-clicking on canvas...');
    await page.mouse.click(box.x + 200, box.y + 200, { button: 'right' });
    await page.waitForTimeout(1000);

    // Check for elements with specific classes or attributes
    const contextMenus = await page.evaluate(() => {
      // Find all elements
      const allElements = Array.from(document.querySelectorAll('*'));

      // Look for elements that might be context menus
      const potentialMenus = allElements.filter(el => {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';
        return (
          (style.position === 'fixed' && style.zIndex &&  parseInt(style.zIndex) > 40) ||
          text.includes('Add Furniture') ||
          text.includes('View Settings')
        );
      });

      return potentialMenus.map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        text: el.textContent?.substring(0, 100),
        position: window.getComputedStyle(el).position,
        zIndex: window.getComputedStyle(el).zIndex,
        display: window.getComputedStyle(el).display,
        visibility: window.getComputedStyle(el).visibility,
        left: window.getComputedStyle(el).left,
        top: window.getComputedStyle(el).top
      }));
    });

    console.log('\nElements that might be context menu:');
    console.log(JSON.stringify(contextMenus, null, 2));

    await page.waitForTimeout(3000);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

checkDOM();
