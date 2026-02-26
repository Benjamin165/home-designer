// Test Feature #33: Furniture position updates

console.log('=== Feature #33: Select and Move Furniture ===\n');

try {
  // Step 1: Get current furniture
  console.log('Step 1: Getting furniture from database...');
  const response1 = await fetch('http://localhost:5000/api/rooms/7/furniture');
  const data1 = await response1.json();

  if (!data1.furniture || data1.furniture.length === 0) {
    throw new Error('No furniture found in room 7');
  }

  const furniture = data1.furniture[0];
  console.log(`Found furniture ID ${furniture.id} at position (${furniture.position_x}, ${furniture.position_z})`);

  // Step 2: Move furniture to new position
  console.log('\nStep 2: Moving furniture to position (3, 3)...');
  const response2 = await fetch(`http://localhost:5000/api/furniture/${furniture.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      position_x: 3,
      position_y: 0,
      position_z: 3
    })
  });

  if (!response2.ok) {
    throw new Error(`Failed to update furniture: ${response2.statusText}`);
  }

  const updatedData = await response2.json();
  console.log(`✓ Furniture moved to (${updatedData.furniture.position_x}, ${updatedData.furniture.position_z})`);

  // Step 3: Verify position was saved
  console.log('\nStep 3: Verifying position was saved...');
  const response3 = await fetch('http://localhost:5000/api/rooms/7/furniture');
  const data3 = await response3.json();

  const verifyFurniture = data3.furniture.find(f => f.id === furniture.id);
  if (!verifyFurniture) {
    throw new Error('Furniture not found after update');
  }

  if (verifyFurniture.position_x === 3 && verifyFurniture.position_z === 3) {
    console.log('✓ Position verified in database');
  } else {
    throw new Error(`Position mismatch! Expected (3, 3), got (${verifyFurniture.position_x}, ${verifyFurniture.position_z})`);
  }

  console.log('\n✅ Feature #33 & #78 - BACKEND TESTS PASSED');
  console.log('- Furniture can be moved via API');
  console.log('- Position updates persist in database');
  console.log('');
  console.log('Now testing in browser...');

} catch (error) {
  console.error('\n❌ TEST FAILED:', error.message);
  process.exit(1);
}
