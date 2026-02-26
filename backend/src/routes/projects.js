import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';
import archiver from 'archiver';
import multer from 'multer';
import unzipper from 'unzipper';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for ZIP file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'));
    }
  }
});

// GET /api/projects - List all projects
router.get('/', async (req, res) => {
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT * FROM projects ORDER BY updated_at DESC');

    let projects = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      projects = result[0].values.map(row => {
        const project = {};
        columns.forEach((col, idx) => {
          project[col] = row[idx];
        });
        return project;
      });
    }

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const { name, description, unit_system } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (name.length > 255) {
      return res.status(400).json({ error: 'Project name must be 255 characters or less' });
    }

    const db = await getDatabase();

    // Insert project
    db.run(
      `INSERT INTO projects (name, description, unit_system, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [name, description || null, unit_system || 'metric']
    );

    // Get the inserted project
    const result = db.exec('SELECT * FROM projects ORDER BY id DESC LIMIT 1');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const project = {};
      columns.forEach((col, idx) => {
        project[col] = row[idx];
      });

      // Save to disk
      saveDatabase();

      res.status(201).json({ project });
    } else {
      throw new Error('Failed to retrieve created project');
    }
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// GET /api/projects/:id - Get a specific project
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const result = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    res.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// PUT /api/projects/:id - Update a project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, unit_system, thumbnail_path } = req.body;

    const db = await getDatabase();

    // Check if project exists
    const checkResult = db.exec('SELECT id FROM projects WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update project
    db.run(
      `UPDATE projects
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           unit_system = COALESCE(?, unit_system),
           thumbnail_path = COALESCE(?, thumbnail_path),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name || null, description || null, unit_system || null, thumbnail_path || null, parseInt(id)]
    );

    // Save to disk
    saveDatabase();

    // Get updated project
    const result = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    res.json({ project });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const projectId = parseInt(id);
    const db = await getDatabase();

    // Check if project exists
    const checkResult = db.exec('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Manual CASCADE deletion (sql.js CASCADE doesn't work reliably)
    // Step 1: Get all floor IDs for this project
    const floorsResult = db.exec('SELECT id FROM floors WHERE project_id = ?', [projectId]);
    const floorIds = floorsResult.length > 0 && floorsResult[0].values.length > 0
      ? floorsResult[0].values.map(row => row[0])
      : [];

    if (floorIds.length > 0) {
      // Step 2: Get all room IDs for these floors
      const roomsResult = db.exec(`SELECT id FROM rooms WHERE floor_id IN (${floorIds.join(',')})`);
      const roomIds = roomsResult.length > 0 && roomsResult[0].values.length > 0
        ? roomsResult[0].values.map(row => row[0])
        : [];

      if (roomIds.length > 0) {
        // Step 3: Get all wall IDs for these rooms
        const wallsResult = db.exec(`SELECT id FROM walls WHERE room_id IN (${roomIds.join(',')})`);
        const wallIds = wallsResult.length > 0 && wallsResult[0].values.length > 0
          ? wallsResult[0].values.map(row => row[0])
          : [];

        if (wallIds.length > 0) {
          // Delete windows and doors for these walls
          db.run(`DELETE FROM windows WHERE wall_id IN (${wallIds.join(',')})`);
          db.run(`DELETE FROM doors WHERE wall_id IN (${wallIds.join(',')})`);
        }

        // Delete furniture, lights, and walls for these rooms
        db.run(`DELETE FROM furniture_placements WHERE room_id IN (${roomIds.join(',')})`);
        db.run(`DELETE FROM lights WHERE room_id IN (${roomIds.join(',')})`);
        db.run(`DELETE FROM walls WHERE room_id IN (${roomIds.join(',')})`);

        // Delete rooms
        db.run(`DELETE FROM rooms WHERE id IN (${roomIds.join(',')})`);
      }

      // Delete floors
      db.run(`DELETE FROM floors WHERE id IN (${floorIds.join(',')})`);
    }

    // Delete edit history for this project
    db.run('DELETE FROM edit_history WHERE project_id = ?', [projectId]);

    // Delete AI generations for this project
    db.run('DELETE FROM ai_generations WHERE project_id = ?', [projectId]);

    // Finally, delete the project itself
    db.run('DELETE FROM projects WHERE id = ?', [projectId]);

    // Save to disk
    saveDatabase();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/duplicate - Duplicate a project
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Get original project
    const projectResult = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);
    if (projectResult.length === 0 || projectResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectColumns = projectResult[0].columns;
    const projectRow = projectResult[0].values[0];
    const project = {};
    projectColumns.forEach((col, idx) => {
      project[col] = projectRow[idx];
    });

    // Helper function to convert SQL result to objects
    const resultToObjects = (result) => {
      if (result.length === 0 || result[0].values.length === 0) return [];
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    };

    // Get all related data
    const floors = resultToObjects(db.exec('SELECT * FROM floors WHERE project_id = ?', [parseInt(id)]));

    // Get all rooms for all floors
    const floorIds = floors.map(f => f.id);
    let rooms = [];
    let walls = [];
    let furniturePlacements = [];
    let lights = [];
    let windows = [];
    let doors = [];

    if (floorIds.length > 0) {
      rooms = resultToObjects(db.exec(`SELECT * FROM rooms WHERE floor_id IN (${floorIds.join(',')})`));

      const roomIds = rooms.map(r => r.id);
      if (roomIds.length > 0) {
        walls = resultToObjects(db.exec(`SELECT * FROM walls WHERE room_id IN (${roomIds.join(',')})`));
        furniturePlacements = resultToObjects(db.exec(`SELECT * FROM furniture_placements WHERE room_id IN (${roomIds.join(',')})`));
        lights = resultToObjects(db.exec(`SELECT * FROM lights WHERE room_id IN (${roomIds.join(',')})`));

        const wallIds = walls.map(w => w.id);
        if (wallIds.length > 0) {
          windows = resultToObjects(db.exec(`SELECT * FROM windows WHERE wall_id IN (${wallIds.join(',')})`));
          doors = resultToObjects(db.exec(`SELECT * FROM doors WHERE wall_id IN (${wallIds.join(',')})`));
        }
      }
    }

    // Create duplicate project
    db.run(
      `INSERT INTO projects (name, description, unit_system, thumbnail_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        project.name + ' (Copy)',
        project.description,
        project.unit_system,
        project.thumbnail_path
      ]
    );

    // Get new project ID
    const newProjectResult = db.exec('SELECT * FROM projects ORDER BY id DESC LIMIT 1');
    const newProjectId = newProjectResult[0].values[0][0];

    // Duplicate floors
    const floorIdMap = new Map(); // old ID -> new ID
    for (const floor of floors) {
      db.run(
        `INSERT INTO floors (project_id, name, level, order_index)
         VALUES (?, ?, ?, ?)`,
        [newProjectId, floor.name, floor.level, floor.order_index]
      );

      const floorResult = db.exec('SELECT * FROM floors ORDER BY id DESC LIMIT 1');
      const newFloorId = floorResult[0].values[0][0];
      floorIdMap.set(floor.id, newFloorId);
    }

    // Duplicate rooms
    const roomIdMap = new Map(); // old ID -> new ID
    for (const room of rooms) {
      const newFloorId = floorIdMap.get(room.floor_id);
      if (!newFloorId) continue;

      db.run(
        `INSERT INTO rooms (floor_id, name, dimensions_json, floor_material, floor_color, ceiling_height, ceiling_material, ceiling_color, position_x, position_y, position_z)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newFloorId,
          room.name,
          room.dimensions_json,
          room.floor_material,
          room.floor_color,
          room.ceiling_height,
          room.ceiling_material,
          room.ceiling_color,
          room.position_x,
          room.position_y,
          room.position_z
        ]
      );

      const roomResult = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');
      const newRoomId = roomResult[0].values[0][0];
      roomIdMap.set(room.id, newRoomId);
    }

    // Duplicate walls
    const wallIdMap = new Map(); // old ID -> new ID
    for (const wall of walls) {
      const newRoomId = roomIdMap.get(wall.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO walls (room_id, start_x, start_z, end_x, end_z, height, thickness, material, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          wall.start_x,
          wall.start_z,
          wall.end_x,
          wall.end_z,
          wall.height,
          wall.thickness,
          wall.material,
          wall.color
        ]
      );

      const wallResult = db.exec('SELECT * FROM walls ORDER BY id DESC LIMIT 1');
      const newWallId = wallResult[0].values[0][0];
      wallIdMap.set(wall.id, newWallId);
    }

    // Duplicate windows
    for (const window of windows) {
      const newWallId = wallIdMap.get(window.wall_id);
      if (!newWallId) continue;

      db.run(
        `INSERT INTO windows (wall_id, position_along_wall, width, height, sill_height, style)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newWallId,
          window.position_along_wall,
          window.width,
          window.height,
          window.sill_height,
          window.style
        ]
      );
    }

    // Duplicate doors
    for (const door of doors) {
      const newWallId = wallIdMap.get(door.wall_id);
      if (!newWallId) continue;

      db.run(
        `INSERT INTO doors (wall_id, position_along_wall, width, height, style, opens_inward)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newWallId,
          door.position_along_wall,
          door.width,
          door.height,
          door.style,
          door.opens_inward
        ]
      );
    }

    // Duplicate furniture placements
    for (const furniture of furniturePlacements) {
      const newRoomId = roomIdMap.get(furniture.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO furniture_placements (room_id, asset_id, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          furniture.asset_id,
          furniture.position_x,
          furniture.position_y,
          furniture.position_z,
          furniture.rotation_x,
          furniture.rotation_y,
          furniture.rotation_z,
          furniture.scale_x,
          furniture.scale_y,
          furniture.scale_z
        ]
      );
    }

    // Duplicate lights
    for (const light of lights) {
      const newRoomId = roomIdMap.get(light.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO lights (room_id, type, position_x, position_y, position_z, color, intensity, casts_shadows)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          light.type,
          light.position_x,
          light.position_y,
          light.position_z,
          light.color,
          light.intensity,
          light.casts_shadows
        ]
      );
    }

    // Save to disk
    saveDatabase();

    // Get the duplicated project
    const duplicateResult = db.exec('SELECT * FROM projects WHERE id = ?', [newProjectId]);
    const columns = duplicateResult[0].columns;
    const row = duplicateResult[0].values[0];
    const duplicateProject = {};
    columns.forEach((col, idx) => {
      duplicateProject[col] = row[idx];
    });

    console.log(`✓ Duplicated project ${id} (${project.name}) -> ${newProjectId} (${duplicateProject.name})`);
    console.log(`  - Floors: ${floors.length}`);
    console.log(`  - Rooms: ${rooms.length}`);
    console.log(`  - Furniture: ${furniturePlacements.length}`);

    res.status(201).json({
      message: 'Project duplicated successfully',
      project: duplicateProject
    });
  } catch (error) {
    console.error('Error duplicating project:', error);
    res.status(500).json({ error: 'Failed to duplicate project' });
  }
});

// POST /api/projects/:id/export - Export project as ZIP
router.post('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Get project
    const projectResult = db.exec('SELECT * FROM projects WHERE id = ?', [parseInt(id)]);
    if (projectResult.length === 0 || projectResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const projectColumns = projectResult[0].columns;
    const projectRow = projectResult[0].values[0];
    const project = {};
    projectColumns.forEach((col, idx) => {
      project[col] = projectRow[idx];
    });

    // Helper function to convert SQL result to objects
    const resultToObjects = (result) => {
      if (result.length === 0 || result[0].values.length === 0) return [];
      const columns = result[0].columns;
      return result[0].values.map(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    };

    // Get all related data
    const floors = resultToObjects(db.exec('SELECT * FROM floors WHERE project_id = ?', [parseInt(id)]));

    // Get all rooms for all floors
    const floorIds = floors.map(f => f.id);
    let rooms = [];
    let walls = [];
    let furniturePlacements = [];
    let lights = [];
    let windows = [];
    let doors = [];

    if (floorIds.length > 0) {
      rooms = resultToObjects(db.exec(`SELECT * FROM rooms WHERE floor_id IN (${floorIds.join(',')})`));

      const roomIds = rooms.map(r => r.id);
      if (roomIds.length > 0) {
        walls = resultToObjects(db.exec(`SELECT * FROM walls WHERE room_id IN (${roomIds.join(',')})`));
        furniturePlacements = resultToObjects(db.exec(`SELECT * FROM furniture_placements WHERE room_id IN (${roomIds.join(',')})`));
        lights = resultToObjects(db.exec(`SELECT * FROM lights WHERE room_id IN (${roomIds.join(',')})`));

        const wallIds = walls.map(w => w.id);
        if (wallIds.length > 0) {
          windows = resultToObjects(db.exec(`SELECT * FROM windows WHERE wall_id IN (${wallIds.join(',')})`));
          doors = resultToObjects(db.exec(`SELECT * FROM doors WHERE wall_id IN (${wallIds.join(',')})`));
        }
      }
    }

    // Get assets used in this project (from furniture placements)
    const assetIds = [...new Set(furniturePlacements.map(fp => fp.asset_id))];
    let assets = [];
    let assetTags = [];
    if (assetIds.length > 0) {
      assets = resultToObjects(db.exec(`SELECT * FROM assets WHERE id IN (${assetIds.join(',')})`));
      assetTags = resultToObjects(db.exec(`SELECT * FROM asset_tags WHERE asset_id IN (${assetIds.join(',')})`));
    }

    // Get edit history for this project
    const editHistory = resultToObjects(db.exec('SELECT * FROM edit_history WHERE project_id = ?', [parseInt(id)]));

    // Get AI generations for this project
    const aiGenerations = resultToObjects(db.exec('SELECT * FROM ai_generations WHERE project_id = ?', [parseInt(id)]));

    // Build export data
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      project,
      floors,
      rooms,
      walls,
      windows,
      doors,
      furniture_placements: furniturePlacements,
      lights,
      assets,
      asset_tags: assetTags,
      edit_history: editHistory,
      ai_generations: aiGenerations
    };

    // Create ZIP file
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Format date for filename: YYYY-MM-DD
    const date = new Date().toISOString().split('T')[0];
    const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeProjectName}_${date}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ error: 'Failed to create archive' });
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add project data JSON
    archive.append(JSON.stringify(exportData, null, 2), { name: 'project_data.json' });

    // Finalize the archive
    await archive.finalize();

    console.log(`✓ Exported project ${id} (${project.name}) as ${filename}`);
  } catch (error) {
    console.error('Error exporting project:', error);
    res.status(500).json({ error: 'Failed to export project' });
  }
});

// POST /api/projects/import - Import project from ZIP
router.post('/import', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    // Extract ZIP from buffer
    const directory = await unzipper.Open.buffer(req.file.buffer);

    // Find project_data.json
    const projectDataFile = directory.files.find(f => f.path === 'project_data.json');
    if (!projectDataFile) {
      return res.status(400).json({ error: 'Invalid backup file: project_data.json not found' });
    }

    // Parse project data
    const content = await projectDataFile.buffer();
    const importData = JSON.parse(content.toString());

    // Validate data structure
    if (!importData.version || !importData.project) {
      return res.status(400).json({ error: 'Invalid backup file: missing required data' });
    }

    const db = await getDatabase();

    // Import project (without ID to create new one)
    const { name, description, unit_system, thumbnail_path } = importData.project;
    db.run(
      `INSERT INTO projects (name, description, unit_system, thumbnail_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        name + ' (Imported)', // Append "(Imported)" to avoid conflicts
        description || null,
        unit_system || 'metric',
        thumbnail_path || null
      ]
    );

    // Get new project ID
    const projectResult = db.exec('SELECT * FROM projects ORDER BY id DESC LIMIT 1');
    if (projectResult.length === 0 || projectResult[0].values.length === 0) {
      throw new Error('Failed to retrieve imported project');
    }

    const newProjectId = projectResult[0].values[0][0]; // First column is ID
    console.log(`✓ Created imported project with ID ${newProjectId}`);

    // Import floors
    const floorIdMap = new Map(); // old ID -> new ID
    for (const floor of importData.floors) {
      db.run(
        `INSERT INTO floors (project_id, name, level, order_index)
         VALUES (?, ?, ?, ?)`,
        [newProjectId, floor.name, floor.level, floor.order_index]
      );

      const floorResult = db.exec('SELECT * FROM floors ORDER BY id DESC LIMIT 1');
      const newFloorId = floorResult[0].values[0][0];
      floorIdMap.set(floor.id, newFloorId);
    }

    // Import rooms
    const roomIdMap = new Map(); // old ID -> new ID
    for (const room of importData.rooms) {
      const newFloorId = floorIdMap.get(room.floor_id);
      if (!newFloorId) continue;

      db.run(
        `INSERT INTO rooms (floor_id, name, dimensions_json, floor_material, floor_color, ceiling_height, ceiling_material, ceiling_color, position_x, position_y, position_z)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newFloorId,
          room.name,
          room.dimensions_json,
          room.floor_material,
          room.floor_color,
          room.ceiling_height,
          room.ceiling_material,
          room.ceiling_color,
          room.position_x,
          room.position_y,
          room.position_z
        ]
      );

      const roomResult = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');
      const newRoomId = roomResult[0].values[0][0];
      roomIdMap.set(room.id, newRoomId);
    }

    // Import walls
    const wallIdMap = new Map(); // old ID -> new ID
    for (const wall of importData.walls) {
      const newRoomId = roomIdMap.get(wall.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO walls (room_id, start_x, start_z, end_x, end_z, height, thickness, material, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          wall.start_x,
          wall.start_z,
          wall.end_x,
          wall.end_z,
          wall.height,
          wall.thickness,
          wall.material,
          wall.color
        ]
      );

      const wallResult = db.exec('SELECT * FROM walls ORDER BY id DESC LIMIT 1');
      const newWallId = wallResult[0].values[0][0];
      wallIdMap.set(wall.id, newWallId);
    }

    // Import windows
    for (const window of importData.windows || []) {
      const newWallId = wallIdMap.get(window.wall_id);
      if (!newWallId) continue;

      db.run(
        `INSERT INTO windows (wall_id, position_along_wall, width, height, sill_height, style)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newWallId,
          window.position_along_wall,
          window.width,
          window.height,
          window.sill_height,
          window.style
        ]
      );
    }

    // Import doors
    for (const door of importData.doors || []) {
      const newWallId = wallIdMap.get(door.wall_id);
      if (!newWallId) continue;

      db.run(
        `INSERT INTO doors (wall_id, position_along_wall, width, height, style, opens_inward)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          newWallId,
          door.position_along_wall,
          door.width,
          door.height,
          door.style,
          door.opens_inward
        ]
      );
    }

    // Import furniture placements
    for (const furniture of importData.furniture_placements) {
      const newRoomId = roomIdMap.get(furniture.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO furniture_placements (room_id, asset_id, position_x, position_y, position_z, rotation_x, rotation_y, rotation_z, scale_x, scale_y, scale_z)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          furniture.asset_id,
          furniture.position_x,
          furniture.position_y,
          furniture.position_z,
          furniture.rotation_x,
          furniture.rotation_y,
          furniture.rotation_z,
          furniture.scale_x,
          furniture.scale_y,
          furniture.scale_z
        ]
      );
    }

    // Import lights
    for (const light of importData.lights) {
      const newRoomId = roomIdMap.get(light.room_id);
      if (!newRoomId) continue;

      db.run(
        `INSERT INTO lights (room_id, type, position_x, position_y, position_z, color, intensity, casts_shadows)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newRoomId,
          light.type,
          light.position_x,
          light.position_y,
          light.position_z,
          light.color,
          light.intensity,
          light.casts_shadows
        ]
      );
    }

    // Save to disk
    saveDatabase();

    // Get the imported project
    const importedProjectResult = db.exec('SELECT * FROM projects WHERE id = ?', [newProjectId]);
    const columns = importedProjectResult[0].columns;
    const row = importedProjectResult[0].values[0];
    const project = {};
    columns.forEach((col, idx) => {
      project[col] = row[idx];
    });

    console.log(`✓ Successfully imported project: ${project.name} (ID: ${newProjectId})`);
    console.log(`  - Floors: ${importData.floors.length}`);
    console.log(`  - Rooms: ${importData.rooms.length}`);
    console.log(`  - Furniture: ${importData.furniture_placements.length}`);

    res.status(201).json({
      message: 'Project imported successfully',
      project
    });
  } catch (error) {
    console.error('Error importing project:', error);
    res.status(500).json({ error: 'Failed to import project: ' + error.message });
  }
});

export default router;
