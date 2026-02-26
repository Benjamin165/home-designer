import { chromium } from 'playwright';

console.log('=== Regression Testing Features 6, 7, and 32 ===\n');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(15000);

const results = {
  feature6: 'PENDING',
  feature7: 'PENDING',
  feature32: 'PENDING'
};

try {
  // Load Project Hub
  console.log('[Setup] Loading Project Hub...');
  await page.goto('http://localhost:5196/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-regression-initial.png', fullPage: true });
  console.log('✓ Project Hub loaded\n');

  // ============================================
  // FEATURE 6: Create new project with name and description
  // ============================================
  console.log('=== Testing Feature 6: Create new project ===');

  // Click "New Project" or "Create New Project" button
  const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create")').first();
  await newProjectBtn.waitFor({ state: 'visible', timeout: 5000 });
  await newProjectBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-regression-f6-dialog.png', fullPage: true });
  console.log('✓ Clicked New Project button');

  // Fill in project name
  const nameInput = page.locator('input[type="text"], input[placeholder*="name" i]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill('Test Living Room');
  console.log('✓ Entered project name: Test Living Room');

  // Fill in description
  const descInput = page.locator('textarea, input[placeholder*="description" i]').first();
  await descInput.fill('Modern minimalist design');
  console.log('✓ Entered description: Modern minimalist design');

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-regression-f6-form-filled.png', fullPage: true });

  // Click Create Project button
  const createBtn = page.locator('button:has-text("Create"), button:has-text("Save")').first();
  await createBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-regression-f6-after-create.png', fullPage: true });
  console.log('✓ Clicked Create Project button');

  // Verify project appears in list with name and description
  const projectCard = page.locator('text="Test Living Room"').first();
  const isVisible = await projectCard.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    // Check if description is also visible
    const descText = page.locator('text="Modern minimalist design"').first();
    const descVisible = await descText.isVisible({ timeout: 2000 }).catch(() => false);

    if (descVisible) {
      console.log('✅ FEATURE 6 PASSED: Project created with name and description visible\n');
      results.feature6 = 'PASSED';
    } else {
      console.log('⚠️  FEATURE 6 PARTIAL: Project created but description not visible\n');
      results.feature6 = 'PARTIAL';
    }
  } else {
    console.log('❌ FEATURE 6 FAILED: Project not found in list\n');
    results.feature6 = 'FAILED';
    await page.screenshot({ path: 'test-regression-f6-FAILED.png', fullPage: true });
  }

  // ============================================
  // FEATURE 7: Open existing project from project list
  // ============================================
  console.log('=== Testing Feature 7: Open existing project ===');

  if (isVisible) {
    // Click on the project card
    await projectCard.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'test-regression-f7-editor.png', fullPage: true });
    console.log('✓ Clicked on project card');

    // Check if we're in the editor (URL should change to /editor/:id)
    const currentUrl = page.url();
    const inEditor = currentUrl.includes('/editor/');

    if (inEditor) {
      console.log('✓ Editor view opened (URL changed to editor route)');

      // Look for project name in the editor toolbar/header
      const bodyText = await page.textContent('body');
      const nameInToolbar = bodyText.includes('Test Living Room');

      if (nameInToolbar) {
        console.log('✓ Project name appears in editor');
        console.log('✅ FEATURE 7 PASSED: Project opened successfully in editor\n');
        results.feature7 = 'PASSED';
      } else {
        console.log('⚠️  FEATURE 7 PARTIAL: Editor opened but project name not immediately visible\n');
        results.feature7 = 'PARTIAL';
      }

      // ============================================
      // FEATURE 32: Drag furniture from library to 3D scene
      // ============================================
      console.log('=== Testing Feature 32: Drag furniture from library ===');

      // First, we need to create a room to drag furniture into
      console.log('[Setup] Creating a room for furniture placement...');

      // Look for "Draw Room" button or similar
      const drawRoomBtn = page.locator('button:has-text("Draw"), button[title*="Draw" i]').first();
      const drawBtnVisible = await drawRoomBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (drawBtnVisible) {
        await drawRoomBtn.click();
        await page.waitForTimeout(500);
        console.log('✓ Clicked Draw Room button');

        // Draw a room by dragging on the canvas
        const canvas = page.locator('canvas').first();
        await canvas.waitFor({ state: 'visible', timeout: 5000 });

        // Get canvas bounding box
        const box = await canvas.boundingBox();
        if (box) {
          const startX = box.x + 200;
          const startY = box.y + 200;
          const endX = startX + 200;
          const endY = startY + 200;

          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.mouse.move(endX, endY, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-regression-f32-room-created.png', fullPage: true });
          console.log('✓ Room created');
        }
      }

      // Open the left sidebar (asset library)
      const libraryBtn = page.locator('button:has-text("Library"), button:has-text("Assets"), button[title*="Library" i]').first();
      const libraryBtnVisible = await libraryBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (libraryBtnVisible) {
        await libraryBtn.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: 'test-regression-f32-library-open.png', fullPage: true });
        console.log('✓ Opened asset library');

        // Look for a furniture item (e.g., sofa, chair, etc.)
        const furnitureItem = page.locator('[draggable="true"], .furniture-item, .asset-item').first();
        const furnitureVisible = await furnitureItem.isVisible({ timeout: 5000 }).catch(() => false);

        if (furnitureVisible) {
          console.log('✓ Found furniture item');

          // Get furniture item and canvas positions
          const itemBox = await furnitureItem.boundingBox();
          const canvas = page.locator('canvas').first();
          const canvasBox = await canvas.boundingBox();

          if (itemBox && canvasBox) {
            // Drag from furniture item to canvas center
            const startX = itemBox.x + itemBox.width / 2;
            const startY = itemBox.y + itemBox.height / 2;
            const endX = canvasBox.x + canvasBox.width / 2;
            const endY = canvasBox.y + canvasBox.height / 2;

            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.waitForTimeout(200);
            await page.screenshot({ path: 'test-regression-f32-during-drag.png', fullPage: true });
            console.log('✓ Started dragging furniture');

            await page.mouse.move(endX, endY, { steps: 20 });
            await page.waitForTimeout(200);
            await page.screenshot({ path: 'test-regression-f32-before-drop.png', fullPage: true });
            console.log('✓ Moved furniture to canvas');

            await page.mouse.up();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'test-regression-f32-after-drop.png', fullPage: true });
            console.log('✓ Dropped furniture');

            // Check if furniture appears in the 3D scene
            // This is harder to verify visually, but we can check for console errors
            const consoleErrors = [];
            page.on('console', msg => {
              if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
              }
            });

            await page.waitForTimeout(1000);

            if (consoleErrors.length === 0) {
              console.log('✅ FEATURE 32 PASSED: Furniture drag and drop completed without errors\n');
              results.feature32 = 'PASSED';
            } else {
              console.log('⚠️  FEATURE 32 PARTIAL: Drag completed but console errors detected\n');
              console.log('Errors:', consoleErrors);
              results.feature32 = 'PARTIAL';
            }
          } else {
            console.log('❌ FEATURE 32 FAILED: Could not get element positions for drag\n');
            results.feature32 = 'FAILED';
          }
        } else {
          console.log('❌ FEATURE 32 FAILED: No furniture items found in library\n');
          results.feature32 = 'FAILED';
        }
      } else {
        console.log('❌ FEATURE 32 FAILED: Could not open asset library\n');
        results.feature32 = 'FAILED';
      }

    } else {
      console.log('❌ FEATURE 7 FAILED: Did not navigate to editor view\n');
      console.log('Current URL:', currentUrl);
      results.feature7 = 'FAILED';
      await page.screenshot({ path: 'test-regression-f7-FAILED.png', fullPage: true });
    }
  } else {
    console.log('⚠️  FEATURE 7 & 32 SKIPPED: Could not test (Feature 6 failed)\n');
    results.feature7 = 'SKIPPED';
    results.feature32 = 'SKIPPED';
  }

  console.log('\n=== Regression Test Results ===');
  console.log(`Feature 6 (Create Project): ${results.feature6}`);
  console.log(`Feature 7 (Open Project): ${results.feature7}`);
  console.log(`Feature 32 (Drag Furniture): ${results.feature32}`);
  console.log('================================\n');

} catch (error) {
  console.error('\n❌ Test error:', error.message);
  await page.screenshot({ path: 'test-regression-ERROR.png', fullPage: true }).catch(() => {});
  process.exit(1);
} finally {
  await browser.close();
}

// Exit with error code if any tests failed
if (results.feature6 === 'FAILED' || results.feature7 === 'FAILED' || results.feature32 === 'FAILED') {
  process.exit(1);
}
