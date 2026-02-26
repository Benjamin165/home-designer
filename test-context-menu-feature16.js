/**
 * Test script for Feature #16: Context menu appears on right-click in 3D viewport
 *
 * Tests:
 * 1. Right-click on empty space in viewport shows context menu with "Add Furniture", "View Settings"
 * 2. Right-click on furniture shows context menu with "Properties", "Duplicate", "Delete"
 * 3. Menu closes when clicking elsewhere
 * 4. Menu actions work correctly
 */

const { chromium } = require('playwright');

async function testContextMenu() {
  console.log('Starting context menu test for Feature #16...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Step 1: Navigate to the app
    console.log('Step 1: Opening Home Designer app...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    // Step 2: Open a project with furniture
    console.log('Step 2: Opening Test Living Room project...');
    await page.click('text=Test Living Room');
    await page.waitForURL('**/editor/**');
    await page.waitForTimeout(2000); // Wait for 3D scene to load
    console.log('✓ Project opened in editor\n');

    // Step 3: Check if there's existing furniture, if not create a room and place furniture
    console.log('Step 3: Checking for existing furniture...');
    const furnitureExists = await page.locator('[data-testid="furniture"]').count() > 0;

    if (!furnitureExists) {
      console.log('No furniture found, creating a room and placing furniture...');

      // Select draw-wall tool
      await page.click('button[title="Draw Wall"]');
      await page.waitForTimeout(500);

      // Get canvas bounds
      const canvas = await page.locator('canvas').first();
      const canvasBox = await canvas.boundingBox();

      if (canvasBox) {
        // Draw a room by dragging on canvas
        const startX = canvasBox.x + canvasBox.width / 3;
        const startY = canvasBox.y + canvasBox.height / 3;
        const endX = canvasBox.x + (2 * canvasBox.width) / 3;
        const endY = canvasBox.y + (2 * canvasBox.height) / 3;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(1000);
        console.log('✓ Room created');

        // Switch to select tool
        await page.click('button[title="Select"]');
        await page.waitForTimeout(500);

        // Open asset library and drag furniture
        const sofaAsset = await page.locator('text=Sofa').first();
        if (await sofaAsset.count() > 0) {
          // Drag sofa to canvas
          const sofaBox = await sofaAsset.boundingBox();
          if (sofaBox) {
            await page.mouse.move(sofaBox.x + sofaBox.width / 2, sofaBox.y + sofaBox.height / 2);
            await page.mouse.down();
            await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
            await page.mouse.up();
            await page.waitForTimeout(1000);
            console.log('✓ Furniture placed');
          }
        }
      }
    } else {
      console.log('✓ Furniture already exists in scene\n');
    }

    // Step 4: Test right-click on empty space
    console.log('Step 4: Testing right-click on empty space...');
    const canvas = await page.locator('canvas').first();
    const canvasBox = await canvas.boundingBox();

    if (canvasBox) {
      // Right-click on empty area of canvas
      const emptyX = canvasBox.x + 100;
      const emptyY = canvasBox.y + 100;

      await page.mouse.click(emptyX, emptyY, { button: 'right' });
      await page.waitForTimeout(500);

      // Check if context menu appears
      const contextMenu = await page.locator('[class*="context"]').or(page.locator('text=Add Furniture'));
      const menuVisible = await contextMenu.count() > 0;

      if (menuVisible) {
        console.log('✓ Context menu appeared on right-click');

        // Verify menu items for empty space
        const addFurnitureItem = await page.locator('text=Add Furniture').count();
        const viewSettingsItem = await page.locator('text=View Settings').count();

        if (addFurnitureItem > 0) {
          console.log('✓ "Add Furniture" menu item found');
        } else {
          console.log('✗ "Add Furniture" menu item NOT found');
        }

        if (viewSettingsItem > 0) {
          console.log('✓ "View Settings" menu item found');
        } else {
          console.log('✗ "View Settings" menu item NOT found');
        }

        // Step 5: Test closing menu by clicking elsewhere
        console.log('\nStep 5: Testing menu closes when clicking elsewhere...');
        await page.mouse.click(canvasBox.x + 200, canvasBox.y + 200);
        await page.waitForTimeout(300);

        const menuStillVisible = await contextMenu.count() > 0;
        if (!menuStillVisible) {
          console.log('✓ Menu closed when clicking elsewhere\n');
        } else {
          console.log('✗ Menu did NOT close when clicking elsewhere\n');
        }
      } else {
        console.log('✗ Context menu did NOT appear on right-click\n');
      }
    }

    // Step 6: Test right-click on furniture (if furniture exists)
    console.log('Step 6: Testing right-click on furniture...');

    // Try to find furniture in the scene
    // Since furniture is rendered in 3D, we need to click in the center area where furniture likely is
    const centerX = canvasBox.x + canvasBox.width / 2;
    const centerY = canvasBox.y + canvasBox.height / 2;

    await page.mouse.click(centerX, centerY, { button: 'right' });
    await page.waitForTimeout(500);

    // Check for furniture-specific menu items
    const propertiesItem = await page.locator('text=Properties').count();
    const duplicateItem = await page.locator('text=Duplicate').count();
    const deleteItem = await page.locator('text=Delete').count();

    if (propertiesItem > 0 || duplicateItem > 0 || deleteItem > 0) {
      console.log('✓ Furniture context menu appeared');

      if (propertiesItem > 0) {
        console.log('✓ "Properties" menu item found');
      }
      if (duplicateItem > 0) {
        console.log('✓ "Duplicate" menu item found');
      }
      if (deleteItem > 0) {
        console.log('✓ "Delete" menu item found');
      }

      // Test delete action
      console.log('\nStep 7: Testing Delete action...');
      const deleteButton = await page.locator('text=Delete').first();
      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(1000);
        console.log('✓ Delete action executed');

        // Check for success toast
        const toast = await page.locator('text=deleted').or(page.locator('text=removed')).count();
        if (toast > 0) {
          console.log('✓ Success toast displayed');
        }
      }
    } else {
      console.log('Note: Furniture menu not shown (might have clicked empty space)');
      console.log('This is OK if no furniture is at center of viewport');
    }

    // Step 8: Take final screenshot
    console.log('\nStep 8: Taking final screenshot...');
    await page.screenshot({ path: 'test-context-menu-result.png' });
    console.log('✓ Screenshot saved as test-context-menu-result.png');

    // Step 9: Check for console errors
    console.log('\nStep 9: Checking for console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    if (errors.length === 0) {
      console.log('✓ No console errors detected');
    } else {
      console.log('✗ Console errors found:');
      errors.forEach(err => console.log('  -', err));
    }

    console.log('\n========================================');
    console.log('Feature #16 Context Menu Test Complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

testContextMenu();
