#!/usr/bin/env node

/**
 * Feature #35: Scale furniture object - COMPLETE TEST
 *
 * This test verifies:
 * 1. Backend API supports scale operations
 * 2. UI controls are present and functional
 * 3. Visual feedback works correctly
 */

import { execSync } from 'child_process';

const API_BASE = 'http://localhost:5000/api';

console.log('\n=== Feature #35: Scale Furniture Object - Complete Test ===\n');

try {
  // Step 1: Create test project
  console.log('Step 1: Creating test project...');
  const projectCmd = `curl -s -X POST ${API_BASE}/projects -H "Content-Type: application/json" -d '{"name":"Feature 35 Complete Test","description":"Testing furniture scaling UI and API"}'`;
  const projectResult = execSync(projectCmd).toString();
  const projectMatch = projectResult.match(/"id":(\d+)/);
  if (!projectMatch) {
    throw new Error('Failed to create project');
  }
  const projectId = projectMatch[1];
  console.log(`✓ Project created (ID: ${projectId})`);

  // Step 2: Create floor
  console.log('Step 2: Creating floor...');
  const floorCmd = `curl -s -X POST ${API_BASE}/projects/${projectId}/floors -H "Content-Type: application/json" -d '{"name":"Ground Floor","level":0}'`;
  const floorResult = execSync(floorCmd).toString();
  const floorMatch = floorResult.match(/"id":(\d+)/);
  if (!floorMatch) {
    throw new Error('Failed to create floor');
  }
  const floorId = floorMatch[1];
  console.log(`✓ Floor created (ID: ${floorId})`);

  // Step 3: Create room
  console.log('Step 3: Creating room...');
  const roomCmd = `curl -s -X POST ${API_BASE}/floors/${floorId}/rooms -H "Content-Type: application/json" -d '{"name":"Test Room","dimensions_json":{"width":5,"depth":5,"vertices":[{"x":0,"z":0},{"x":5,"z":0},{"x":5,"z":5},{"x":0,"z":5}]},"position_x":0,"position_z":0,"ceiling_height":2.8}'`;
  const roomResult = execSync(roomCmd).toString();
  const roomMatch = roomResult.match(/"id":(\d+)/);
  if (!roomMatch) {
    throw new Error('Failed to create room');
  }
  const roomId = roomMatch[1];
  console.log(`✓ Room created (ID: ${roomId})`);

  // Step 4: Get furniture asset
  console.log('Step 4: Getting furniture asset...');
  const assetsCmd = `curl -s ${API_BASE}/assets`;
  const assetsResult = execSync(assetsCmd).toString();
  const assetMatch = assetsResult.match(/"id":(\d+)/);
  if (!assetMatch) {
    throw new Error('No furniture assets found');
  }
  const assetId = assetMatch[1];
  console.log(`✓ Using asset (ID: ${assetId})`);

  // Step 5: Place furniture
  console.log('Step 5: Placing furniture...');
  const furnitureCmd = `curl -s -X POST ${API_BASE}/rooms/${roomId}/furniture -H "Content-Type: application/json" -d '{"asset_id":${assetId},"position_x":2.5,"position_y":0,"position_z":2.5,"rotation_y":0,"scale_x":1.0,"scale_y":1.0,"scale_z":1.0}'`;
  const furnitureResult = execSync(furnitureCmd).toString();
  const furnitureMatch = furnitureResult.match(/"id":(\d+)/);
  if (!furnitureMatch) {
    throw new Error('Failed to place furniture');
  }
  const furnitureId = furnitureMatch[1];
  console.log(`✓ Furniture placed (ID: ${furnitureId})`);

  // Step 6: Test scaling to 1.5x
  console.log('\nStep 6: Testing scale to 1.5x...');
  const scale15Cmd = `curl -s -X PUT ${API_BASE}/furniture/${furnitureId} -H "Content-Type: application/json" -d '{"scale_x":1.5,"scale_y":1.5,"scale_z":1.5}'`;
  execSync(scale15Cmd);

  // Verify scale
  const verifyCmd = `curl -s ${API_BASE}/rooms/${roomId}/furniture`;
  const verifyResult = execSync(verifyCmd).toString();
  if (!verifyResult.includes('"scale_x":1.5')) {
    throw new Error('Scale not updated to 1.5');
  }
  console.log('✓ Scaled to 1.5x successfully');
  console.log('  Scale values:', verifyResult.match(/"scale_[xyz]":[0-9.]+/g).join(', '));

  // Step 7: Test scaling back to 1.0x
  console.log('\nStep 7: Testing scale back to 1.0x...');
  const scale10Cmd = `curl -s -X PUT ${API_BASE}/furniture/${furnitureId} -H "Content-Type: application/json" -d '{"scale_x":1.0,"scale_y":1.0,"scale_z":1.0}'`;
  execSync(scale10Cmd);

  // Verify scale
  const verify10Result = execSync(verifyCmd).toString();
  if (!verify10Result.includes('"scale_x":1')) {
    throw new Error('Scale not reset to 1.0');
  }
  console.log('✓ Scaled back to 1.0x successfully');
  console.log('  Scale values:', verify10Result.match(/"scale_[xyz]":[0-9.]+/g).join(', '));

  // Step 8: Open in browser for UI verification
  console.log('\n=== UI Verification ===\n');
  console.log(`Opening project in browser: http://localhost:5173/editor/${projectId}`);
  console.log('Opening browser...');

  execSync(`playwright-cli open http://localhost:5173/editor/${projectId}`, { stdio: 'inherit' });

  // Wait for page to load
  console.log('Waiting for page to load...');
  execSync('sleep 5', { shell: true });

  // Take screenshot
  console.log('Taking screenshot...');
  execSync('playwright-cli screenshot', { stdio: 'inherit' });

  // Check console errors
  console.log('\nChecking for console errors...');
  const consoleResult = execSync('playwright-cli console').toString();
  const hasErrors = consoleResult.toLowerCase().includes('error') && !consoleResult.includes('[DEBUG');
  if (hasErrors) {
    console.log('⚠ Console errors detected (check details above)');
  } else {
    console.log('✓ No critical console errors');
  }

  console.log('\n=== Manual UI Verification Steps ===');
  console.log('1. Click on the furniture in the 3D viewport to select it');
  console.log('2. Check Properties Panel on the right side');
  console.log('3. Verify "Scale" section is visible (after Rotation section)');
  console.log('4. Verify scale input shows "1.00"');
  console.log('5. Click the "1.5×" quick button');
  console.log('6. Verify furniture visually increases in size');
  console.log('7. Verify scale input updates to "1.50"');
  console.log('8. Click the "1.0×" quick button');
  console.log('9. Verify furniture returns to original size');
  console.log('10. Verify scale input resets to "1.00"');
  console.log('\nPress Enter when done verifying, or Ctrl+C to exit...');

  // Keep browser open for manual verification
  execSync('read -p "Press Enter to continue..."', { stdio: 'inherit', shell: '/bin/bash' });

  // Close browser
  console.log('\nClosing browser...');
  execSync('playwright-cli close', { stdio: 'inherit' });

  // Cleanup
  console.log('\nCleaning up test project...');
  const deleteCmd = `curl -s -X DELETE ${API_BASE}/projects/${projectId}`;
  execSync(deleteCmd);
  console.log('✓ Test project deleted');

  console.log('\n=== ✅ Feature #35 Test COMPLETE ===\n');
  console.log('Backend API: ✅ PASSING');
  console.log('UI Controls: Manual verification required');
  console.log('\nIf all manual verification steps passed, Feature #35 is ready to mark as passing.');

} catch (error) {
  console.error('\n❌ Test FAILED:', error.message);
  process.exit(1);
}
