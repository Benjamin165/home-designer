#!/usr/bin/env node
import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchProjects(port = 5000) {
  const response = await fetch(`http://localhost:${port}/api/projects`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function checkTestProject(port = 5000) {
  try {
    const data = await fetchProjects(port);
    const projects = data.projects || [];
    const testProject = projects.find(p => p.name === 'TEST_PERSIST_12345');
    return testProject || null;
  } catch (error) {
    return null;
  }
}

async function killBackend() {
  try {
    // Try to kill processes on port 5000
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM node.exe 2>nul || exit 0');
    } else {
      await execAsync('killall node 2>/dev/null || true');
    }
    console.log('✓ Backend processes stopped');
    await wait(2000); // Wait for clean shutdown
  } catch (error) {
    console.log('Note: Error stopping processes (may already be stopped)');
  }
}

async function startBackend() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', ['src/server.js'], {
      cwd: 'backend',
      stdio: 'pipe',
      detached: false
    });

    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(output.trim());
      if (output.includes('Server running on')) {
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(data.toString().trim());
    });

    server.on('error', reject);

    // Timeout after 10 seconds
    setTimeout(() => reject(new Error('Server start timeout')), 10000);
  });
}

async function main() {
  console.log('========================================');
  console.log('  Feature #3: Persistence Test');
  console.log('========================================\n');

  // Step 1: Check if test project exists
  console.log('Step 1: Checking if TEST_PERSIST_12345 exists...');
  let project = await checkTestProject();
  if (!project) {
    console.log('✗ Test project not found - cannot proceed with test');
    process.exit(1);
  }
  console.log(`✓ Test project found: ID=${project.id}\n`);

  // Step 2: Stop the server
  console.log('Step 2: Stopping backend server...');
  await killBackend();
  await wait(1000);
  console.log('');

  // Step 3: Verify server is stopped
  console.log('Step 3: Verifying server is stopped...');
  const serverDown = await checkTestProject();
  if (serverDown) {
    console.log('✗ Server still responding - killing failed');
    process.exit(1);
  }
  console.log('✓ Server is stopped\n');

  // Step 4: Start fresh server
  console.log('Step 4: Starting fresh backend server...');
  let server;
  try {
    server = await startBackend();
    await wait(2000); // Wait for full initialization
    console.log('✓ Server started\n');
  } catch (error) {
    console.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }

  // Step 5: Check if data persisted
  console.log('Step 5: Checking if TEST_PERSIST_12345 still exists...');
  project = await checkTestProject();

  // Cleanup
  if (server) {
    server.kill();
    await wait(1000);
  }

  if (!project) {
    console.log('✗ FAILED: Test project not found after restart');
    console.log('   Data did NOT persist across server restart\n');
    process.exit(1);
  }

  console.log(`✓ SUCCESS: Test project still exists (ID=${project.id})`);
  console.log('✓ Data persisted across server restart\n');
  console.log('========================================');
  console.log('  Feature #3: PASSING ✓');
  console.log('========================================\n');
}

main().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
