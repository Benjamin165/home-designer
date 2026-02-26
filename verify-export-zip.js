import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import unzipper from 'unzipper';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const zipPath = join(__dirname, '.playwright-cli', 'test-bedroom-redesign-2026-02-26.zip');

console.log('📦 Extracting ZIP file:', zipPath);
console.log('');

const directory = await unzipper.Open.file(zipPath);

console.log('✓ ZIP file contents:');
directory.files.forEach(file => {
  console.log(`  - ${file.path} (${file.uncompressedSize} bytes)`);
});

console.log('');

// Read project_data.json
const projectDataFile = directory.files.find(f => f.path === 'project_data.json');
if (projectDataFile) {
  const content = await projectDataFile.buffer();
  const data = JSON.parse(content.toString());

  console.log('📋 Project Data Summary:');
  console.log(`  - Version: ${data.version}`);
  console.log(`  - Exported at: ${data.exported_at}`);
  console.log(`  - Project: ${data.project.name} (ID: ${data.project.id})`);
  console.log(`  - Description: ${data.project.description || '(none)'}`);
  console.log(`  - Floors: ${data.floors.length}`);
  console.log(`  - Rooms: ${data.rooms.length}`);
  console.log(`  - Walls: ${data.walls.length}`);
  console.log(`  - Furniture Placements: ${data.furniture_placements.length}`);
  console.log(`  - Lights: ${data.lights.length}`);
  console.log(`  - Assets: ${data.assets.length}`);
  console.log(`  - Edit History: ${data.edit_history.length}`);
  console.log(`  - AI Generations: ${data.ai_generations.length}`);
  console.log('');
  console.log('✅ ZIP file structure is correct!');
} else {
  console.log('❌ ERROR: project_data.json not found in ZIP');
  process.exit(1);
}
