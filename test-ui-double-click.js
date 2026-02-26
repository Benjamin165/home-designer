// Test double-click prevention in the UI using Playwright
const { chromium } = require('playwright');

async function testUIDoubleClick() {
  console.log('=== Testing UI Double-Click Prevention ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Get initial project count via API
    const initialResponse = await fetch('http://localhost:5000/api/projects');
    const initialData = await initialResponse.json();
    const initialCount = initialData.projects.length;
    console.log(`Initial project count: ${initialCount}`);

    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');

    // Click New Project button
    console.log('\nOpening create project modal...');
    await page.getByRole('button', { name: 'New Project' }).click();
    await page.waitForTimeout(300);

    // Fill in project name
    const timestamp = Date.now();
    const projectName = `UI Double Click Test ${timestamp}`;
    console.log(`Entering project name: ${projectName}`);
    await page.getByLabel('Project Name *').fill(projectName);

    // Rapidly double-click the Create Project button
    console.log('\nSimulating rapid double-click on Create Project button...');
    const createButton = page.getByRole('button', { name: 'Create Project' });

    // Click multiple times as fast as possible
    await Promise.all([
      createButton.click(),
      createButton.click(),
      createButton.click()
    ]);

    // Wait for modal to close and projects to reload
    await page.waitForTimeout(2000);

    // Check final project count
    const finalResponse = await fetch('http://localhost:5000/api/projects');
    const finalData = await finalResponse.json();
    const finalCount = finalData.projects.length;
    const projects = finalData.projects;

    console.log(`\nFinal project count: ${finalCount}`);
    console.log(`Projects created: ${finalCount - initialCount}`);

    // Find projects with our test name
    const testProjects = projects.filter(p => p.name === projectName);
    console.log(`\nProjects with exact name "${projectName}": ${testProjects.length}`);
    testProjects.forEach(p => {
      console.log(`  - ID ${p.id}: ${p.name}`);
    });

    // Check browser console for our prevention message
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    console.log('\nBrowser console logs:');
    logs.forEach(log => console.log(`  ${log}`));

    // Verdict
    if (testProjects.length > 1) {
      console.log('\n❌ FAIL: Multiple projects created from double-click!');
      await browser.close();
      return false;
    } else if (finalCount - initialCount !== 1) {
      console.log(`\n⚠️  WARNING: Expected 1 project created, got ${finalCount - initialCount}`);
      await browser.close();
      return false;
    } else {
      console.log('\n✅ PASS: Double-click prevention working! Only one project created.');
      await browser.close();
      return true;
    }
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    await browser.close();
    return false;
  }
}

testUIDoubleClick()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
