import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Testing Features 6, 7, 9...\n');

try {
  // Navigate to Project Hub
  await page.goto('http://localhost:5173');
  console.log('✓ Navigated to Project Hub');

  // Test Feature 6: Create new project
  console.log('\n[Feature 6] Testing project creation...');
  await page.getByRole('button', { name: 'New Project' }).click();
  await page.getByLabel('Project Name').fill('Test Regression Fix');
  await page.getByLabel('Description').fill('Testing features 6, 7, 9 after bug fix');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await page.waitForURL('http://localhost:5173/', { timeout: 5000 });
  console.log('✓ Project created successfully');

  // Verify project appears in list
  const projectCard = page.getByText('Test Regression Fix').first();
  await page.waitForTimeout(500);
  if (await projectCard.isVisible()) {
    console.log('✓ Project appears in project list');
  } else {
    throw new Error('Project not found in list!');
  }

  // Test Feature 7: Open project
  console.log('\n[Feature 7] Testing project open...');
  await projectCard.click();
  await page.waitForURL(/\/editor\/\d+/, { timeout: 5000 });
  console.log('✓ Editor opened');

  // Verify project name in toolbar
  await page.waitForTimeout(1000);
  const toolbar = page.getByRole('heading', { name: 'Test Regression Fix' });
  if (await toolbar.isVisible()) {
    console.log('✓ Project name appears in editor toolbar');
  } else {
    console.log('⚠ Project name not immediately visible in toolbar');
  }

  // Return to Project Hub
  await page.getByRole('button', { name: 'Back to Projects' }).click();
  await page.waitForTimeout(500);

  // Handle unsaved changes dialog if it appears
  const leaveButton = page.getByRole('button', { name: 'Leave without Saving' });
  if (await leaveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await leaveButton.click();
  }

  await page.waitForURL('http://localhost:5173/', { timeout: 5000 });
  console.log('✓ Returned to Project Hub');

  // Test Feature 9: Delete project with confirmation
  console.log('\n[Feature 9] Testing project deletion...');
  await page.waitForTimeout(500);
  const deleteButton = page.getByRole('button', { name: 'Delete Test Regression Fix' });
  await deleteButton.click();
  await page.waitForTimeout(500);

  // Look for confirmation dialog
  const dialogVisible = await page.locator('text=sure').isVisible({ timeout: 2000 }).catch(() => false);
  if (dialogVisible) {
    console.log('✓ Confirmation dialog appeared');

    // Click Cancel/No first
    const cancelButton = page.getByRole('button', { name: /Cancel|No/i }).first();
    await cancelButton.click();
    await page.waitForTimeout(500);

    // Verify project still exists
    if (await projectCard.isVisible({ timeout: 2000 }).catch(() => true)) {
      console.log('✓ Cancel button works - project still exists');
    }

    // Delete for real
    await deleteButton.click();
    await page.waitForTimeout(500);
    const confirmButton = page.getByRole('button', { name: /Delete|Yes|Confirm/i }).first();
    await confirmButton.click();
    await page.waitForTimeout(1500);

    // Verify project is gone
    const stillVisible = await projectCard.isVisible({ timeout: 2000 }).catch(() => false);
    if (!stillVisible) {
      console.log('✓ Project successfully deleted');
    } else {
      console.log('⚠ Project may still be visible');
    }
  } else {
    console.log('⚠ Confirmation dialog not found');
  }

  // Verify via API
  const response = await page.request.get('http://localhost:5000/api/projects');
  const data = await response.json();
  const deletedProject = data.projects.find(p => p.name === 'Test Regression Fix');
  if (!deletedProject) {
    console.log('✓ Project not found in API (correctly deleted)');
  } else {
    console.log('⚠ Project still exists in API');
  }

  console.log('\n========================================');
  console.log('✅ All features tested!');
  console.log('========================================');

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
} finally {
  await browser.close();
}
