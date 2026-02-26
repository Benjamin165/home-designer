import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

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
    const db = await getDatabase();

    // Check if project exists
    const checkResult = db.exec('SELECT id FROM projects WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Delete project (CASCADE will handle related records)
    db.run('DELETE FROM projects WHERE id = ?', [parseInt(id)]);

    // Save to disk
    saveDatabase();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
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

export default router;
