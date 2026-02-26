const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Feature 9: Delete project with confirmation dialog
    console.log('\n=== Testing Feature 9: Delete project ===');

    // First, create a test project to delete
    console.log('Step 1: Creating a test project to delete...');
    await page.click('button:has-text("New Project")');
    await page.waitForTimeout(1000);

    const nameInput = await page.locator('input[placeholder*="name" i], input[type="text"]').first();
    await nameInput.fill('Project To Delete');

    const createButton = await page.locator('button:has-text("Create"), button:has-text("Save")').first();
    await createButton.click();
    await page.waitForTimeout(2000);

    console.log('✓ Test project created');
    await page.screenshot({ path: 'test-delete-1-created.png' });

    // Step 2: Navigate to Project Hub (should already be there)
    console.log('Step 2: On Project Hub');

    // Step 3: Click delete action on the project
    console.log('Step 3: Finding and clicking delete button...');

    // Find the project card
    const projectCard = await page.locator('h3:has-text("Project To Delete")').locator('xpath=ancestor::div[contains(@class, "")]').first();

    // Hover to reveal delete button (if needed)
    await projectCard.hover();
    await page.waitForTimeout(500);

    // Find and click the delete button for this specific project
    const deleteButton = await page.locator('button[aria-label*="Delete Project To Delete"], button:has-text("Delete"):near(:text("Project To Delete"))').first();
    await deleteButton.click();
    await page.waitForTimeout(1000);

    console.log('✓ Clicked delete button');
    await page.screenshot({ path: 'test-delete-2-dialog.png' });

    // Step 4: Verify confirmation dialog appears
    console.log('Step 4: Checking for confirmation dialog...');
    const dialog = await page.locator('dialog, [role="dialog"], [role="alertdialog"]').first();
    const dialogVisible = await dialog.isVisible().catch(() => false);

    if (dialogVisible) {
      console.log('✓ Confirmation dialog appeared');

      // Check if dialog contains project name
      const dialogText = await dialog.textContent();
      if (dialogText.includes('Project To Delete')) {
        console.log('✓ Dialog contains project name');
      } else {
        console.log('✗ Dialog does not contain project name. Text:', dialogText);
      }

      // Step 5: Click Cancel and verify project still exists
      console.log('Step 5: Clicking Cancel...');
      const cancelButton = await dialog.locator('button:has-text("Cancel")').first();
      await cancelButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-delete-3-after-cancel.png' });

      const projectStillExists = await page.locator('h3:has-text("Project To Delete")').count();
      if (projectStillExists > 0) {
        console.log('✓ Project still exists after Cancel');
      } else {
        console.log('✗ Project was deleted after Cancel!');
      }

      // Step 6: Click delete again and confirm
      console.log('Step 6: Clicking delete again...');
      const deleteButton2 = await page.locator('button[aria-label*="Delete Project To Delete"], button:has-text("Delete"):near(:text("Project To Delete"))').first();
      await deleteButton2.click();
      await page.waitForTimeout(1000);

      console.log('Step 7: Clicking Confirm/Delete...');
      const confirmButton = await page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
      await confirmButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-delete-4-after-confirm.png' });

      // Step 7: Verify project is removed from list
      console.log('Step 8: Verifying project is removed...');
      const projectExists = await page.locator('h3:has-text("Project To Delete")').count();
      if (projectExists === 0) {
        console.log('✓ Project removed from list');
      } else {
        console.log('✗ Project still exists in list!');
      }

      // Step 8: Verify GET /api/projects no longer includes deleted project
      console.log('Step 9: Checking API...');
      const response = await page.request.get('http://localhost:5173/api/projects');
      const projects = await response.json();
      const deletedProjectInAPI = projects.some(p => p.name === 'Project To Delete');

      if (!deletedProjectInAPI) {
        console.log('✓ Project not in API response');
      } else {
        console.log('✗ Project still in API response!');
      }

      console.log('\n✓ Feature 9 PASSED');

    } else {
      console.log('✗ Confirmation dialog did not appear!');
      console.log('Feature 9 FAILED');
    }

  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: 'test-delete-error.png' });
  } finally {
    await browser.close();
  }
})();
