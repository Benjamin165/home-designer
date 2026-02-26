import { chromium } from 'playwright';

async function testFeatures() {
  console.log('Starting Feature 3, 6, 7 regression tests...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Feature 6: Create new project with name and description
    console.log('=== Testing Feature 6: Create new project ===');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(3000);

    // Take screenshot of Project Hub
    await page.screenshot({ path: 'test-f6-project-hub.png', fullPage: true });
    console.log('✓ Navigated to Project Hub');

    // Click "Create New Project" button
    const createButton = page.locator('button:has-text("Create New Project"), button:has-text("New Project")').first();
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    await createButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-f6-dialog-open.png', fullPage: true });
    console.log('✓ Clicked Create New Project button');

    // Fill in project name
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 5000 });
    await nameInput.fill('Test Living Room');
    console.log('✓ Entered project name');

    // Fill in description
    const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i], input[name="description"]').first();
    if (await descInput.count() > 0) {
      await descInput.fill('Modern minimalist design');
      console.log('✓ Entered description');
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-f6-form-filled.png', fullPage: true });

    // Click Create/Save button
    const saveButton = page.locator('button:has-text("Create"), button:has-text("Save")').first();
    await saveButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-f6-after-create.png', fullPage: true });
    console.log('✓ Clicked Create button');

    // Verify project appears in list
    const projectCard = page.locator('text="Test Living Room"').first();
    const isVisible = await projectCard.isVisible().catch(() => false);

    if (isVisible) {
      console.log('✅ Feature 6 PASSED: Project created and visible in list');
    } else {
      console.log('❌ Feature 6 FAILED: Project not visible in list');
      await page.screenshot({ path: 'test-f6-FAILED.png', fullPage: true });
    }

    // Feature 7: Open existing project from project list
    console.log('\n=== Testing Feature 7: Open existing project ===');

    // Click on the project card to open it
    if (isVisible) {
      await projectCard.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-f7-editor-open.png', fullPage: true });
      console.log('✓ Clicked on project card');

      // Verify editor opened and project name appears in toolbar
      const editorToolbar = page.locator('header, [role="banner"], nav').first();
      const toolbarText = await editorToolbar.textContent().catch(() => '');

      if (toolbarText.includes('Test Living Room') || toolbarText.includes('Living Room')) {
        console.log('✅ Feature 7 PASSED: Editor opened with project name in toolbar');
      } else {
        console.log('❌ Feature 7 FAILED: Project name not in toolbar');
        console.log('Toolbar text:', toolbarText);
        await page.screenshot({ path: 'test-f7-FAILED.png', fullPage: true });
      }
    } else {
      console.log('⚠️  Feature 7 SKIPPED: Could not test because Feature 6 failed');
    }

    console.log('\n=== All tests complete ===');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testFeatures();
