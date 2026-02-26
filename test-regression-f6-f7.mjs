import { chromium } from 'playwright';

console.log('=== Regression Testing Features 6 & 7 ===\n');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(15000);

try {
  // Load Project Hub
  console.log('[Setup] Loading Project Hub...');
  await page.goto('http://localhost:5173/', { waitUntil: 'commit', timeout: 10000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'regression-f6-f7-start.png', fullPage: true });
  console.log('✓ Project Hub loaded\n');

  // ============================================
  // FEATURE 6: Create new project with name and description
  // ============================================
  console.log('=== Testing Feature 6: Create new project ===');

  // Click "New Project" button
  const newProjectBtn = page.locator('button:has-text("New Project")');
  await newProjectBtn.waitFor({ state: 'visible', timeout: 5000 });
  await newProjectBtn.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'regression-f6-dialog.png', fullPage: true });
  console.log('✓ Clicked New Project button');

  // Fill in project name
  const nameInput = page.locator('input[type="text"]').first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill('Regression Test Feature 6');
  console.log('✓ Entered project name');

  // Fill in description
  const descInput = page.locator('textarea, input').nth(1);
  await descInput.fill('Feature 6 regression test description');
  console.log('✓ Entered description');

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'regression-f6-form-filled.png', fullPage: true });

  // Click Create Project button
  const createBtn = page.locator('button:has-text("Create"), button:has-text("Create Project")').first();
  await createBtn.click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'regression-f6-after-create.png', fullPage: true });
  console.log('✓ Clicked Create Project button');

  // Verify project appears in list with name and description
  const projectCard = page.locator('text="Regression Test Feature 6"').first();
  const isVisible = await projectCard.isVisible({ timeout: 5000 }).catch(() => false);

  if (isVisible) {
    // Check if description is also visible
    const descText = page.locator('text="Feature 6 regression test description"').first();
    const descVisible = await descText.isVisible({ timeout: 2000 }).catch(() => false);

    if (descVisible) {
      console.log('✅ FEATURE 6 PASSED: Project created with name and description visible\n');
    } else {
      console.log('⚠️  FEATURE 6 PARTIAL: Project created but description not visible\n');
    }
  } else {
    console.log('❌ FEATURE 6 FAILED: Project not found in list\n');
    await page.screenshot({ path: 'regression-f6-FAILED.png', fullPage: true });
  }

  // ============================================
  // FEATURE 7: Open existing project from project list
  // ============================================
  console.log('=== Testing Feature 7: Open existing project ===');

  if (isVisible) {
    // Click on the project card
    await projectCard.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'regression-f7-editor.png', fullPage: true });
    console.log('✓ Clicked on project card');

    // Check if we're in the editor (URL should change to /editor/:id)
    const currentUrl = page.url();
    const inEditor = currentUrl.includes('/editor/');

    if (inEditor) {
      console.log('✓ Editor view opened (URL changed to editor route)');

      // Look for project name in the editor toolbar/header
      const bodyText = await page.textContent('body');
      const nameInToolbar = bodyText.includes('Regression Test Feature 6');

      if (nameInToolbar) {
        console.log('✓ Project name appears in editor');
        console.log('✅ FEATURE 7 PASSED: Project opened successfully in editor\n');
      } else {
        console.log('⚠️  FEATURE 7 PARTIAL: Editor opened but project name not immediately visible\n');
      }
    } else {
      console.log('❌ FEATURE 7 FAILED: Did not navigate to editor view\n');
      console.log('Current URL:', currentUrl);
      await page.screenshot({ path: 'regression-f7-FAILED.png', fullPage: true });
    }
  } else {
    console.log('⚠️  FEATURE 7 SKIPPED: Could not test (Feature 6 failed)\n');
  }

  console.log('=== Regression tests complete ===');

} catch (error) {
  console.error('\n❌ Test error:', error.message);
  await page.screenshot({ path: 'regression-error.png', fullPage: true }).catch(() => {});
  process.exit(1);
} finally {
  await browser.close();
}
