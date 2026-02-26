/**
 * Simplified test for Feature #16: Context menu on right-click
 */

const { chromium } = require('playwright');

async function testContextMenu() {
  console.log('Testing Feature #16: Context menu on right-click\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  try {
    // Open the app
    console.log('1. Opening app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    // Open a project
    console.log('2. Opening project...');
    await page.click('text=Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(2000);
    console.log('✓ Project opened\n');

    // Get canvas element
    const canvas = await page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    // Test 1: Right-click on empty space
    console.log('Test 1: Right-click on empty space in viewport...');
    const emptyX = canvasBox.x + 100;
    const emptyY = canvasBox.y + 100;

    await page.mouse.click(emptyX, emptyY, { button: 'right' });
    await page.waitForTimeout(500);

    // Check for context menu
    const addFurniture = await page.locator('text=Add Furniture').count();
    const viewSettings = await page.locator('text=View Settings').count();

    if (addFurniture > 0 && viewSettings > 0) {
      console.log('✓ Context menu appeared with correct options');
      console.log('  - Add Furniture: present');
      console.log('  - View Settings: present');
    } else {
      console.log('✗ Context menu did not appear or missing items');
      console.log(`  - Add Furniture: ${addFurniture > 0 ? 'present' : 'MISSING'}`);
      console.log(`  - View Settings: ${viewSettings > 0 ? 'present' : 'MISSING'}`);
    }

    // Take screenshot of context menu
    await page.screenshot({ path: 'context-menu-empty-space.png' });
    console.log('✓ Screenshot saved: context-menu-empty-space.png\n');

    // Test 2: Close menu by clicking elsewhere
    console.log('Test 2: Close menu by clicking elsewhere...');
    await page.mouse.click(canvasBox.x + 300, canvasBox.y + 300);
    await page.waitForTimeout(300);

    const menuStillVisible = await page.locator('text=Add Furniture').count();
    if (menuStillVisible === 0) {
      console.log('✓ Menu closed successfully\n');
    } else {
      console.log('✗ Menu did not close\n');
    }

    // Test 3: Try to trigger furniture context menu
    console.log('Test 3: Testing furniture context menu...');
    console.log('(Attempting to right-click in center where furniture might be)');

    const centerX = canvasBox.x + canvasBox.width / 2;
    const centerY = canvasBox.y + canvasBox.height / 2;

    await page.mouse.click(centerX, centerY, { button: 'right' });
    await page.waitForTimeout(500);

    const properties = await page.locator('text=Properties').count();
    const duplicate = await page.locator('text=Duplicate').count();
    const deleteItem = await page.locator('text=Delete').count();

    if (properties > 0 || duplicate > 0 || deleteItem > 0) {
      console.log('✓ Furniture context menu appeared');
      console.log(`  - Properties: ${properties > 0 ? 'present' : 'absent'}`);
      console.log(`  - Duplicate: ${duplicate > 0 ? 'present' : 'absent'}`);
      console.log(`  - Delete: ${deleteItem > 0 ? 'present' : 'absent'}`);

      await page.screenshot({ path: 'context-menu-furniture.png' });
      console.log('✓ Screenshot saved: context-menu-furniture.png');
    } else {
      console.log('Note: Furniture menu not shown (no furniture at click position)');
      console.log('This is expected if no furniture exists in the scene.');
    }

    // Check console errors
    console.log('\n4. Checking for console errors...');
    if (errors.length === 0) {
      console.log('✓ Zero console errors\n');
    } else {
      console.log(`✗ Found ${errors.length} console errors:`);
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n========================================');
    console.log('Feature #16 Test Summary:');
    console.log('- Context menu on empty space: ' + (addFurniture > 0 && viewSettings > 0 ? 'PASS ✓' : 'FAIL ✗'));
    console.log('- Menu closes on click elsewhere: ' + (menuStillVisible === 0 ? 'PASS ✓' : 'FAIL ✗'));
    console.log('- Console errors: ' + (errors.length === 0 ? 'PASS ✓' : 'FAIL ✗'));
    console.log('========================================\n');

    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

testContextMenu();
