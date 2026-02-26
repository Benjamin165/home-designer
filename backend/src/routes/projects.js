import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

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

export default router;
