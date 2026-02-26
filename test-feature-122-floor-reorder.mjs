#!/usr/bin/env node

/**
 * Feature #122: Floor reordering persists to database
 *
 * Test steps:
 * 1. Create a project with 3 floors
 * 2. Verify initial order in floor switcher
 * 3. Drag to reorder floors (e.g., move Floor 3 to position 1)
 * 4. Query the floors table
 * 5. Verify the order_index column reflects the new order
 * 6. Refresh the page
 * 7. Verify the floors display in the new order
 */

const API_BASE = 'http://localhost:5000/api';

async function apiCall(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function main() {
  console.log('\n=== Feature #122: Floor Reordering Persistence Test ===\n');

  // Step 1: Create a test project with 3 floors
  console.log('Step 1: Creating test project...');
  const projectData = await apiCall('/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Floor Reorder Test - Feature 122',
      description: 'Testing floor drag-and-drop reordering',
      unit_system: 'metric',
    }),
  });

  const projectId = projectData.project.id;
  console.log(`✓ Project created with ID: ${projectId}`);

  // Create 3 floors
  console.log('\nStep 2: Creating 3 floors...');
  const floor1 = await apiCall(`/projects/${projectId}/floors`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Ground Floor',
      level: 0,
      order_index: 0,
    }),
  });
  console.log(`✓ Floor 1 created: ${floor1.floor.name} (ID: ${floor1.floor.id}, order_index: ${floor1.floor.order_index})`);

  const floor2 = await apiCall(`/projects/${projectId}/floors`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'First Floor',
      level: 1,
      order_index: 1,
    }),
  });
  console.log(`✓ Floor 2 created: ${floor2.floor.name} (ID: ${floor2.floor.id}, order_index: ${floor2.floor.order_index})`);

  const floor3 = await apiCall(`/projects/${projectId}/floors`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Second Floor',
      level: 2,
      order_index: 2,
    }),
  });
  console.log(`✓ Floor 3 created: ${floor3.floor.name} (ID: ${floor3.floor.id}, order_index: ${floor3.floor.order_index})`);

  // Step 3: Verify initial order
  console.log('\nStep 3: Verifying initial floor order...');
  let floorsData = await apiCall(`/projects/${projectId}/floors`);
  console.log('Initial order:');
  floorsData.floors.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (ID: ${f.id}, order_index: ${f.order_index})`);
  });

  // Step 4: Reorder floors - Move "Second Floor" (currently at position 2) to position 0
  console.log('\nStep 4: Reordering floors (moving Second Floor to position 0)...');
  const reorderData = [
    { id: floor3.floor.id, order_index: 0 },  // Second Floor -> position 0
    { id: floor1.floor.id, order_index: 1 },  // Ground Floor -> position 1
    { id: floor2.floor.id, order_index: 2 },  // First Floor -> position 2
  ];

  await apiCall('/floors/reorder', {
    method: 'PUT',
    body: JSON.stringify({ floors: reorderData }),
  });
  console.log('✓ Reorder API call successful');

  // Step 5: Query the database to verify order_index
  console.log('\nStep 5: Querying database to verify order_index...');
  floorsData = await apiCall(`/projects/${projectId}/floors`);
  console.log('New order in database:');
  floorsData.floors.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (ID: ${f.id}, order_index: ${f.order_index})`);
  });

  // Verify the order is correct
  const expectedOrder = [
    { id: floor3.floor.id, name: 'Second Floor', order_index: 0 },
    { id: floor1.floor.id, name: 'Ground Floor', order_index: 1 },
    { id: floor2.floor.id, name: 'First Floor', order_index: 2 },
  ];

  let success = true;
  for (let i = 0; i < expectedOrder.length; i++) {
    const expected = expectedOrder[i];
    const actual = floorsData.floors[i];

    if (actual.id !== expected.id || actual.order_index !== expected.order_index) {
      console.error(`✗ Mismatch at position ${i}: expected ${expected.name} (order_index: ${expected.order_index}), got ${actual.name} (order_index: ${actual.order_index})`);
      success = false;
    }
  }

  if (success) {
    console.log('\n✓ Database order matches expected order!');
  }

  // Step 6: Simulate page refresh by querying again
  console.log('\nStep 6: Simulating page refresh (querying floors again)...');
  floorsData = await apiCall(`/projects/${projectId}/floors`);
  console.log('Order after "refresh":');
  floorsData.floors.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name} (ID: ${f.id}, order_index: ${f.order_index})`);
  });

  // Verify persistence
  let persistSuccess = true;
  for (let i = 0; i < expectedOrder.length; i++) {
    const expected = expectedOrder[i];
    const actual = floorsData.floors[i];

    if (actual.id !== expected.id || actual.order_index !== expected.order_index) {
      console.error(`✗ Order not persisted at position ${i}`);
      persistSuccess = false;
    }
  }

  if (persistSuccess) {
    console.log('\n✓ Floor order persisted correctly after refresh!');
  }

  // Summary
  console.log('\n=== Test Summary ===');
  if (success && persistSuccess) {
    console.log('✅ Feature #122 PASSING - Floor reordering persists to database');
    console.log(`\nTest project created: "${projectData.project.name}" (ID: ${projectId})`);
    console.log('You can verify this in the UI by opening the project.');
  } else {
    console.log('❌ Feature #122 FAILING - Issues detected');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ Test failed with error:', error.message);
  process.exit(1);
});
