const { chromium } = require('playwright');

async function testFeatures() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== FEATURE 6: Create new project with name and description ===\n');

  try {
    // Navigate to Project Hub
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Take screenshot of Project Hub
    await page.screenshot({ path: 'feature6-step1-project-hub.png' });
    console.log('✓ Navigated to Project Hub');

    // Click "Create New Project" button
    const createButton = page.locator('button:has-text("Create New Project"), button:has-text("New Project")');
    await createButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Clicked Create New Project button');

    // Fill in project name
    const nameInput = page.locator('input[placeholder*="name" i], input[name="name"], input[type="text"]').first();
    await nameInput.fill('Test Living Room');
    console.log('✓ Entered project name');

    // Fill in description
    const descInput = page.locator('textarea, input[placeholder*="description" i]').first();
    await descInput.fill('Modern minimalist design');
    console.log('✓ Entered description');

    // Click Create/Save button
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Save")').first();
    await submitButton.click();
    await page.waitForTimeout(2000);

    // Take screenshot after creation
    await page.screenshot({ path: 'feature6-step2-after-create.png' });
    console.log('✓ Clicked Create button');

    // Verify the project appears in the list (either we're redirected to hub or we're in editor)
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('/editor/')) {
      // We're in the editor, navigate back to hub
      const backButton = page.locator('button:has-text("Back to Projects")');
      await backButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Returned to Project Hub from editor');
    }

    // Take screenshot of project list
    await page.screenshot({ path: 'feature6-step3-project-list.png' });

    // Verify project card exists
    const projectCard = page.locator('text="Test Living Room"');
    const projectExists = await projectCard.count() > 0;

    if (projectExists) {
      console.log('✅ FEATURE 6 PASSED: Project "Test Living Room" created and appears in list');
    } else {
      console.log('❌ FEATURE 6 FAILED: Project not found in list');
    }

    console.log('\n=== FEATURE 7: Open existing project from project list ===\n');

    // Click on the project card to open it
    await projectCard.first().click();
    await page.waitForTimeout(2000);

    // Take screenshot of opened project
    await page.screenshot({ path: 'feature7-step1-opened-editor.png' });

    // Verify we're in the editor
    const editorUrl = page.url();
    const isInEditor = editorUrl.includes('/editor/');
    console.log('Current URL:', editorUrl);

    // Verify project name appears in toolbar
    const projectNameInToolbar = page.locator('text="Test Living Room"');
    const nameInToolbar = await projectNameInToolbar.count() > 0;

    if (isInEditor && nameInToolbar) {
      console.log('✅ FEATURE 7 PASSED: Project opened in editor with correct name');
    } else {
      console.log('❌ FEATURE 7 FAILED: Project did not open correctly');
      console.log('  - In editor:', isInEditor);
      console.log('  - Name in toolbar:', nameInToolbar);
    }

    console.log('\n=== FEATURE 9: Delete project with confirmation dialog ===\n');

    // Create a project to delete
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    // Create "Project To Delete"
    await createButton.click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="name" i], input[name="name"], input[type="text"]').first().fill('Project To Delete');
    await page.locator('button:has-text("Create"), button:has-text("Save")').first().click();
    await page.waitForTimeout(2000);

    // Navigate back to hub if in editor
    if (page.url().includes('/editor/')) {
      await page.locator('button:has-text("Back to Projects")').click();
      await page.waitForTimeout(1000);
    }

    console.log('✓ Created "Project To Delete"');
    await page.screenshot({ path: 'feature9-step1-with-test-project.png' });

    // Find and click delete button for "Project To Delete"
    // Look for delete button within the project card
    const projectToDelete = page.locator('[class*="project"], [class*="card"]').filter({ hasText: 'Project To Delete' });
    const deleteButton = projectToDelete.locator('button[title*="delete" i], button:has-text("Delete"), button:has([class*="trash"])').first();

    // If not found, try a more generic approach
    if (await deleteButton.count() === 0) {
      console.log('Looking for delete button with alternative selectors...');
      const allDeleteButtons = page.locator('button[title*="delete" i], button:has(svg[class*="trash"]), button:has([data-icon="trash"])');
      const buttonCount = await allDeleteButtons.count();
      console.log(`Found ${buttonCount} delete buttons`);
      if (buttonCount > 0) {
        // Click the last one (most recent project)
        await allDeleteButtons.last().click();
      }
    } else {
      await deleteButton.click();
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'feature9-step2-delete-dialog.png' });
    console.log('✓ Clicked delete button');

    // Verify confirmation dialog appears
    const dialogText = await page.textContent('body');
    const hasDialog = dialogText.includes('delete') || dialogText.includes('Delete') || dialogText.includes('confirm');

    if (hasDialog) {
      console.log('✓ Confirmation dialog appeared');

      // Click Cancel first
      const cancelButton = page.locator('button:has-text("Cancel")').first();
      if (await cancelButton.count() > 0) {
        await cancelButton.click();
        await page.waitForTimeout(500);
        console.log('✓ Clicked Cancel');

        // Verify project still exists
        const stillExists = await page.locator('text="Project To Delete"').count() > 0;
        if (stillExists) {
          console.log('✓ Project still exists after Cancel');
        }

        // Click delete again
        const deleteButton2 = projectToDelete.locator('button[title*="delete" i], button:has-text("Delete"), button:has([class*="trash"])').first();
        if (await deleteButton2.count() === 0) {
          const allDeleteButtons = page.locator('button[title*="delete" i], button:has(svg[class*="trash"]), button:has([data-icon="trash"])');
          await allDeleteButtons.last().click();
        } else {
          await deleteButton2.click();
        }
        await page.waitForTimeout(500);
      }

      // Click Confirm/Delete
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")').first();
      await confirmButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked Confirm');

      await page.screenshot({ path: 'feature9-step3-after-delete.png' });

      // Verify project is gone
      const deletedProjectExists = await page.locator('text="Project To Delete"').count() > 0;

      if (!deletedProjectExists) {
        console.log('✅ FEATURE 9 PASSED: Project deleted successfully');
      } else {
        console.log('❌ FEATURE 9 FAILED: Project still exists after deletion');
      }
    } else {
      console.log('❌ FEATURE 9 FAILED: Confirmation dialog did not appear');
    }

  } catch (error) {
    console.error('Error during testing:', error);
  }

  await browser.close();
}

testFeatures().catch(console.error);
