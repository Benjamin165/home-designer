import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// GET /api/projects/:projectId/floors - List floors for a project
router.get('/projects/:projectId/floors', async (req, res) => {
  try {
    const { projectId } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      'SELECT * FROM floors WHERE project_id = ? ORDER BY order_index ASC',
      [parseInt(projectId)]
    );

    let floors = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      floors = result[0].values.map(row => {
        const floor = {};
        columns.forEach((col, idx) => {
          floor[col] = row[idx];
        });
        return floor;
      });
    }

    res.json({ floors });
  } catch (error) {
    console.error('Error fetching floors:', error);
    res.status(500).json({ error: 'Failed to fetch floors' });
  }
});

// POST /api/projects/:projectId/floors - Create a new floor
router.post('/projects/:projectId/floors', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { level, name, order_index } = req.body;

    if (!name || level === undefined || order_index === undefined) {
      return res.status(400).json({ error: 'Required fields: name, level, order_index' });
    }

    const db = await getDatabase();

    // Verify project exists
    const projectCheck = db.exec('SELECT id FROM projects WHERE id = ?', [parseInt(projectId)]);
    if (projectCheck.length === 0 || projectCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Insert floor
    db.run(
      `INSERT INTO floors (project_id, level, name, order_index, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [parseInt(projectId), level, name, order_index]
    );

    // Get the inserted floor
    const result = db.exec('SELECT * FROM floors ORDER BY id DESC LIMIT 1');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const floor = {};
      columns.forEach((col, idx) => {
        floor[col] = row[idx];
      });

      saveDatabase();
      res.status(201).json({ floor });
    } else {
      throw new Error('Failed to retrieve created floor');
    }
  } catch (error) {
    console.error('Error creating floor:', error);
    res.status(500).json({ error: 'Failed to create floor' });
  }
});

// PUT /api/floors/:id - Update a floor
router.put('/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { level, name, order_index } = req.body;

    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM floors WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    db.run(
      `UPDATE floors
       SET level = COALESCE(?, level),
           name = COALESCE(?, name),
           order_index = COALESCE(?, order_index)
       WHERE id = ?`,
      [
        level !== undefined ? level : null,
        name || null,
        order_index !== undefined ? order_index : null,
        parseInt(id)
      ]
    );

    saveDatabase();

    const result = db.exec('SELECT * FROM floors WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const floor = {};
    columns.forEach((col, idx) => {
      floor[col] = row[idx];
    });

    res.json({ floor });
  } catch (error) {
    console.error('Error updating floor:', error);
    res.status(500).json({ error: 'Failed to update floor' });
  }
});

// DELETE /api/floors/:id - Delete a floor
router.delete('/floors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM floors WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    // Delete floor (CASCADE will handle related rooms)
    db.run('DELETE FROM floors WHERE id = ?', [parseInt(id)]);

    saveDatabase();

    res.json({ message: 'Floor deleted successfully' });
  } catch (error) {
    console.error('Error deleting floor:', error);
    res.status(500).json({ error: 'Failed to delete floor' });
  }
});

// PUT /api/floors/reorder - Reorder floors
router.put('/floors/reorder', async (req, res) => {
  try {
    const { floors } = req.body; // Array of {id, order_index}

    if (!Array.isArray(floors)) {
      return res.status(400).json({ error: 'floors must be an array' });
    }

    const db = await getDatabase();

    // Update each floor's order_index
    floors.forEach(({ id, order_index }) => {
      db.run('UPDATE floors SET order_index = ? WHERE id = ?', [order_index, parseInt(id)]);
    });

    saveDatabase();

    res.json({ message: 'Floors reordered successfully' });
  } catch (error) {
    console.error('Error reordering floors:', error);
    res.status(500).json({ error: 'Failed to reorder floors' });
  }
});

export default router;
