import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// POST /api/rooms/:roomId/furniture - Place furniture in a room
router.post('/rooms/:roomId/furniture', async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      asset_id,
      position_x,
      position_y,
      position_z,
      rotation_x,
      rotation_y,
      rotation_z,
      scale_x,
      scale_y,
      scale_z,
      locked,
      light_intensity,
      light_color
    } = req.body;

    if (!asset_id || position_x === undefined || position_y === undefined || position_z === undefined) {
      return res.status(400).json({ error: 'asset_id, position_x, position_y, position_z are required' });
    }

    const db = await getDatabase();

    // Verify room exists
    const roomCheck = db.exec('SELECT id FROM rooms WHERE id = ?', [parseInt(roomId)]);
    if (roomCheck.length === 0 || roomCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Verify asset exists
    const assetCheck = db.exec('SELECT id FROM assets WHERE id = ?', [parseInt(asset_id)]);
    if (assetCheck.length === 0 || assetCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Insert furniture placement
    db.run(
      `INSERT INTO furniture_placements (
        room_id, asset_id,
        position_x, position_y, position_z,
        rotation_x, rotation_y, rotation_z,
        scale_x, scale_y, scale_z,
        locked, light_intensity, light_color, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        parseInt(roomId),
        parseInt(asset_id),
        position_x,
        position_y,
        position_z,
        rotation_x || 0,
        rotation_y || 0,
        rotation_z || 0,
        scale_x || 1,
        scale_y || 1,
        scale_z || 1,
        locked ? 1 : 0,
        light_intensity !== undefined ? light_intensity : 2.0,
        light_color || '#fff8e1'
      ]
    );

    // Get the inserted furniture placement with asset details
    const result = db.exec(
      `SELECT fp.*, a.name as asset_name, a.category, a.width, a.height, a.depth, a.model_path
       FROM furniture_placements fp
       JOIN assets a ON fp.asset_id = a.id
       ORDER BY fp.id DESC LIMIT 1`
    );

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const furniture = {};
      columns.forEach((col, idx) => {
        furniture[col] = row[idx];
      });

      saveDatabase();
      res.status(201).json({ furniture });
    } else {
      throw new Error('Failed to retrieve created furniture placement');
    }
  } catch (error) {
    console.error('Error placing furniture:', error);
    res.status(500).json({ error: 'Failed to place furniture' });
  }
});

// PUT /api/furniture/:id - Update furniture placement
router.put('/furniture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      position_x,
      position_y,
      position_z,
      rotation_x,
      rotation_y,
      rotation_z,
      scale_x,
      scale_y,
      scale_z,
      locked,
      light_intensity,
      light_color
    } = req.body;

    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM furniture_placements WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Furniture placement not found' });
    }

    db.run(
      `UPDATE furniture_placements
       SET position_x = COALESCE(?, position_x),
           position_y = COALESCE(?, position_y),
           position_z = COALESCE(?, position_z),
           rotation_x = COALESCE(?, rotation_x),
           rotation_y = COALESCE(?, rotation_y),
           rotation_z = COALESCE(?, rotation_z),
           scale_x = COALESCE(?, scale_x),
           scale_y = COALESCE(?, scale_y),
           scale_z = COALESCE(?, scale_z),
           locked = COALESCE(?, locked),
           light_intensity = COALESCE(?, light_intensity),
           light_color = COALESCE(?, light_color)
       WHERE id = ?`,
      [
        position_x !== undefined ? position_x : null,
        position_y !== undefined ? position_y : null,
        position_z !== undefined ? position_z : null,
        rotation_x !== undefined ? rotation_x : null,
        rotation_y !== undefined ? rotation_y : null,
        rotation_z !== undefined ? rotation_z : null,
        scale_x !== undefined ? scale_x : null,
        scale_y !== undefined ? scale_y : null,
        scale_z !== undefined ? scale_z : null,
        locked !== undefined ? (locked ? 1 : 0) : null,
        light_intensity !== undefined ? light_intensity : null,
        light_color !== undefined ? light_color : null,
        parseInt(id)
      ]
    );

    saveDatabase();

    const result = db.exec(
      `SELECT fp.*, a.name as asset_name, a.category, a.width, a.height, a.depth, a.model_path
       FROM furniture_placements fp
       JOIN assets a ON fp.asset_id = a.id
       WHERE fp.id = ?`,
      [parseInt(id)]
    );

    const columns = result[0].columns;
    const row = result[0].values[0];
    const furniture = {};
    columns.forEach((col, idx) => {
      furniture[col] = row[idx];
    });

    res.json({ furniture });
  } catch (error) {
    console.error('Error updating furniture:', error);
    res.status(500).json({ error: 'Failed to update furniture' });
  }
});

// DELETE /api/furniture/:id - Remove furniture placement
router.delete('/furniture/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM furniture_placements WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Furniture placement not found' });
    }

    db.run('DELETE FROM furniture_placements WHERE id = ?', [parseInt(id)]);
    saveDatabase();

    res.json({ message: 'Furniture removed successfully' });
  } catch (error) {
    console.error('Error removing furniture:', error);
    res.status(500).json({ error: 'Failed to remove furniture' });
  }
});

export default router;
