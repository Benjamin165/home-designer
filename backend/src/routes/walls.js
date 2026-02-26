import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// POST /api/rooms/:roomId/walls - Add a wall segment to a room
router.post('/rooms/:roomId/walls', async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      start_x,
      start_y,
      end_x,
      end_y,
      height,
      material,
      color,
      texture_path,
      has_window,
      has_door
    } = req.body;

    if (start_x === undefined || start_y === undefined ||
        end_x === undefined || end_y === undefined || height === undefined) {
      return res.status(400).json({
        error: 'Required fields: start_x, start_y, end_x, end_y, height'
      });
    }

    const db = await getDatabase();

    // Verify room exists
    const roomCheck = db.exec('SELECT id FROM rooms WHERE id = ?', [parseInt(roomId)]);
    if (roomCheck.length === 0 || roomCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Insert wall
    db.run(
      `INSERT INTO walls (
        room_id, start_x, start_y, end_x, end_y, height,
        material, color, texture_path, has_window, has_door
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(roomId),
        start_x,
        start_y,
        end_x,
        end_y,
        height,
        material || null,
        color || null,
        texture_path || null,
        has_window ? 1 : 0,
        has_door ? 1 : 0
      ]
    );

    // Get the inserted wall
    const result = db.exec('SELECT * FROM walls ORDER BY id DESC LIMIT 1');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const wall = {};
      columns.forEach((col, idx) => {
        wall[col] = row[idx];
      });

      saveDatabase();
      res.status(201).json({ wall });
    } else {
      throw new Error('Failed to retrieve created wall');
    }
  } catch (error) {
    console.error('Error creating wall:', error);
    res.status(500).json({ error: 'Failed to create wall' });
  }
});

// PUT /api/walls/:id - Update a wall
router.put('/walls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      start_x,
      start_y,
      end_x,
      end_y,
      height,
      material,
      color,
      texture_path,
      has_window,
      has_door
    } = req.body;

    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM walls WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Wall not found' });
    }

    db.run(
      `UPDATE walls
       SET start_x = COALESCE(?, start_x),
           start_y = COALESCE(?, start_y),
           end_x = COALESCE(?, end_x),
           end_y = COALESCE(?, end_y),
           height = COALESCE(?, height),
           material = COALESCE(?, material),
           color = COALESCE(?, color),
           texture_path = COALESCE(?, texture_path),
           has_window = COALESCE(?, has_window),
           has_door = COALESCE(?, has_door)
       WHERE id = ?`,
      [
        start_x !== undefined ? start_x : null,
        start_y !== undefined ? start_y : null,
        end_x !== undefined ? end_x : null,
        end_y !== undefined ? end_y : null,
        height !== undefined ? height : null,
        material || null,
        color || null,
        texture_path || null,
        has_window !== undefined ? (has_window ? 1 : 0) : null,
        has_door !== undefined ? (has_door ? 1 : 0) : null,
        parseInt(id)
      ]
    );

    saveDatabase();

    const result = db.exec('SELECT * FROM walls WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const wall = {};
    columns.forEach((col, idx) => {
      wall[col] = row[idx];
    });

    res.json({ wall });
  } catch (error) {
    console.error('Error updating wall:', error);
    res.status(500).json({ error: 'Failed to update wall' });
  }
});

// DELETE /api/walls/:id - Delete a wall
router.delete('/walls/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM walls WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Wall not found' });
    }

    // Delete wall (CASCADE will handle related windows and doors)
    db.run('DELETE FROM walls WHERE id = ?', [parseInt(id)]);

    saveDatabase();

    res.json({ message: 'Wall deleted successfully' });
  } catch (error) {
    console.error('Error deleting wall:', error);
    res.status(500).json({ error: 'Failed to delete wall' });
  }
});

export default router;
