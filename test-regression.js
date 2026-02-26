const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    console.log('Taking initial screenshot...');
    await page.screenshot({ path: 'test-initial.png' });

    // Feature 6: Create new project
    console.log('\n=== Testing Feature 6: Create new project ===');
    console.log('Clicking New Project button...');
    await page.click('button:has-text("New Project")');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-after-new-project-click.png' });

    console.log('Filling in project details...');
    // Look for name input
    const nameInput = await page.locator('input[placeholder*="name" i], input[type="text"]').first();
    await nameInput.fill('Regression Test Feature 6');

    // Look for description input
    const descInput = await page.locator('textarea, input[placeholder*="description" i]').first();
    if (await descInput.count() > 0) {
      await descInput.fill('Testing project creation');
    }

    await page.screenshot({ path: 'test-after-filling-form.png' });

    console.log('Clicking Create/Save button...');
    // Try to find and click Create or Save button
    const createButton = await page.locator('button:has-text("Create"), button:has-text("Save")').first();
    await createButton.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-after-create.png' });

    // Verify project appears in list
    console.log('Verifying project appears in list...');
    const projectCard = await page.locator('h3:has-text("Regression Test Feature 6")');
    if (await projectCard.count() > 0) {
      console.log('✓ Project created successfully!');
    } else {
      console.log('✗ Project not found in list!');
    }

    // Feature 7: Open existing project
    console.log('\n=== Testing Feature 7: Open existing project ===');
    const testProjectCard = await page.locator('h3:has-text("Test Project Open")').locator('..');
    if (await testProjectCard.count() > 0) {
      console.log('Clicking on Test Project Open...');
      await testProjectCard.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-after-open-project.png' });

      // Verify editor opened
      const url = page.url();
      if (url.includes('/editor/') || url.includes('/project/')) {
        console.log('✓ Editor opened successfully!');
      } else {
        console.log('✗ Editor did not open! URL:', url);
      }
    }

  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: 'test-error.png' });
  } finally {
    await browser.close();
  }
})();
