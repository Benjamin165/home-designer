const { chromium } = require('playwright');

async function testFeature9() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== FEATURE 9: Delete project with confirmation dialog (Fixed Test) ===\n');

  try {
    // Navigate to Project Hub
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // Create a unique project to delete
    const uniqueName = 'Delete Me Test ' + Date.now();

    const createButton = page.locator('button:has-text("Create New Project"), button:has-text("New Project")');
    await createButton.click();
    await page.waitForTimeout(500);

    await page.locator('input[placeholder*="name" i], input[name="name"], input[type="text"]').first().fill(uniqueName);
    await page.locator('button:has-text("Create"), button:has-text("Save")').first().click();
    await page.waitForTimeout(2000);

    // Navigate back to hub if in editor
    if (page.url().includes('/editor/')) {
      await page.locator('button:has-text("Back to Projects")').click();
      await page.waitForTimeout(1000);
    }

    console.log(`✓ Created project: "${uniqueName}"`);
    await page.screenshot({ path: 'feature9-fixed-step1.png' });

    // Verify project exists
    const projectCard = page.locator('.group, [class*="card"]').filter({ hasText: uniqueName });
    const existsBefore = await projectCard.count() > 0;
    console.log(`✓ Project card found: ${existsBefore}`);

    // Hover over the project card to show delete button
    await projectCard.hover();
    await page.waitForTimeout(500);

    // Find and click the delete button within this specific project card
    const deleteButton = projectCard.locator('button[title*="delete" i], button:has(svg), button[class*="delete"]').last();
    await deleteButton.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'feature9-fixed-step2-dialog.png' });
    console.log('✓ Clicked delete button');

    // Verify dialog contains our project name
    const dialogContent = await page.textContent('body');
    const dialogHasCorrectProject = dialogContent.includes(uniqueName);

    if (!dialogHasCorrectProject) {
      console.log('⚠️  Warning: Dialog may not show the correct project name');
      console.log('   Dialog content preview:', dialogContent.substring(0, 200));
    } else {
      console.log('✓ Confirmation dialog shows correct project name');
    }

    // Click Cancel first
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      await page.waitForTimeout(1000);
      console.log('✓ Clicked Cancel');

      // Verify project still exists
      const stillExists = await page.locator(`text="${uniqueName}"`).count() > 0;
      console.log(`✓ After Cancel - Project exists: ${stillExists}`);

      if (!stillExists) {
        console.log('❌ FEATURE 9 FAILED: Project was deleted even after clicking Cancel!');
        await browser.close();
        return;
      }
    }

    // Open delete dialog again
    await projectCard.hover();
    await page.waitForTimeout(500);
    await projectCard.locator('button[title*="delete" i], button:has(svg), button[class*="delete"]').last().click();
    await page.waitForTimeout(1000);

    // Click Confirm/Delete
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').first();
    await confirmButton.click();
    await page.waitForTimeout(2000);
    console.log('✓ Clicked Confirm/Delete');

    await page.screenshot({ path: 'feature9-fixed-step3-after-delete.png' });

    // Verify project is gone
    const existsAfter = await page.locator(`text="${uniqueName}"`).count() > 0;
    console.log(`✓ After Delete - Project exists: ${existsAfter}`);

    // Also verify via API
    const response = await page.request.get('http://localhost:5000/api/projects');
    const projects = await response.json();
    const projectInDb = projects.some(p => p.name === uniqueName);
    console.log(`✓ Project in database: ${projectInDb}`);

    if (!existsAfter && !projectInDb) {
      console.log('✅ FEATURE 9 PASSED: Project deleted successfully with confirmation dialog');
    } else {
      console.log('❌ FEATURE 9 FAILED: Project was not deleted properly');
      console.log(`   - Still visible in UI: ${existsAfter}`);
      console.log(`   - Still in database: ${projectInDb}`);
    }

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: 'feature9-fixed-error.png' });
  }

  await browser.close();
}

testFeature9().catch(console.error);
