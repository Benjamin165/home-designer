// Test double-click behavior for creating projects
const API_BASE = 'http://localhost:5000/api';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  return { status: response.status, data: await response.json() };
}

async function testDoubleClick() {
  console.log('=== Testing Double-Click Project Creation ===\n');

  // Get initial project count
  const initialResponse = await fetchJson(`${API_BASE}/projects`);
  const initialCount = initialResponse.data.projects.length;
  console.log(`Initial project count: ${initialCount}`);

  // Simulate rapid double-click by sending two POST requests simultaneously
  console.log('\nSimulating rapid double-click...');
  const projectData = {
    name: `Double Click Test ${Date.now()}`,
    description: 'Testing double-click prevention'
  };

  try {
    // Send two requests at the exact same time
    const [result1, result2] = await Promise.all([
      fetchJson(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      }).catch(err => ({ status: 'error', error: err.message })),
      fetchJson(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      }).catch(err => ({ status: 'error', error: err.message }))
    ]);

    console.log('\nRequest 1 status:', result1.status);
    console.log('Request 2 status:', result2.status);

    // Wait a bit for any async operations
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get final project count
    const finalResponse = await fetchJson(`${API_BASE}/projects`);
    const finalCount = finalResponse.data.projects.length;
    const projects = finalResponse.data.projects;

    console.log(`\nFinal project count: ${finalCount}`);
    console.log(`Projects created: ${finalCount - initialCount}`);

    // Check for duplicates with same name
    const testProjects = projects.filter(p => p.name.startsWith('Double Click Test'));
    console.log(`\nProjects with "Double Click Test" name: ${testProjects.length}`);
    testProjects.forEach(p => {
      console.log(`  - ID ${p.id}: ${p.name}`);
    });

    // Verdict
    if (finalCount - initialCount > 1) {
      console.log('\n❌ ISSUE DETECTED: Multiple projects created from double-click!');
      return false;
    } else {
      console.log('\n✅ PASS: Only one project created');
      return true;
    }
  } catch (error) {
    console.error('Error during test:', error.message);
    return false;
  }
}

testDoubleClick()
  .then(passed => process.exit(passed ? 0 : 1))
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
