import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// Valid light types
const LIGHT_TYPES = ['point', 'spot', 'area', 'floor_lamp', 'ceiling', 'wall_sconce', 'table_lamp', 'pendant'];

/**
 * GET /api/rooms/:roomId/lights
 * Get all lights in a room
 */
router.get('/rooms/:roomId/lights', async (req, res) => {
  try {
    const { roomId } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      'SELECT * FROM lights WHERE room_id = ? ORDER BY id ASC',
      [parseInt(roomId)]
    );

    let lights = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      lights = result[0].values.map(row => {
        const light = {};
        columns.forEach((col, idx) => {
          light[col] = row[idx];
        });
        return light;
      });
    }

    res.json({ lights });
  } catch (error) {
    console.error('Error fetching lights:', error);
    res.status(500).json({ error: 'Failed to fetch lights' });
  }
});

/**
 * GET /api/floors/:floorId/lights
 * Get all lights on a floor (across all rooms)
 */
router.get('/floors/:floorId/lights', async (req, res) => {
  try {
    const { floorId } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      `SELECT l.*, r.floor_id 
       FROM lights l 
       JOIN rooms r ON l.room_id = r.id 
       WHERE r.floor_id = ? 
       ORDER BY l.id ASC`,
      [parseInt(floorId)]
    );

    let lights = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      lights = result[0].values.map(row => {
        const light = {};
        columns.forEach((col, idx) => {
          light[col] = row[idx];
        });
        return light;
      });
    }

    res.json({ lights });
  } catch (error) {
    console.error('Error fetching floor lights:', error);
    res.status(500).json({ error: 'Failed to fetch lights' });
  }
});

/**
 * POST /api/rooms/:roomId/lights
 * Create a new light in a room
 */
router.post('/rooms/:roomId/lights', async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      type = 'point',
      name,
      position_x = 0,
      position_y = 2.5,
      position_z = 0,
      intensity = 1.0,
      color = '#ffffff',
      cone_angle,
      distance = 10.0,
      decay = 2.0,
      cast_shadow = true,
      color_temperature = 4000,
      target_x,
      target_y,
      target_z,
      width,
      height,
      penumbra = 0.0,
    } = req.body;

    // Validate type
    if (!LIGHT_TYPES.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid light type. Must be one of: ${LIGHT_TYPES.join(', ')}` 
      });
    }

    const db = await getDatabase();

    // Verify room exists
    const roomCheck = db.exec('SELECT id FROM rooms WHERE id = ?', [parseInt(roomId)]);
    if (roomCheck.length === 0 || roomCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    db.run(
      `INSERT INTO lights (
        room_id, type, name, position_x, position_y, position_z,
        intensity, color, cone_angle, distance, decay, cast_shadow,
        color_temperature, target_x, target_y, target_z, width, height, penumbra
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(roomId),
        type,
        name || null,
        position_x,
        position_y,
        position_z,
        intensity,
        color,
        cone_angle || null,
        distance,
        decay,
        cast_shadow ? 1 : 0,
        color_temperature,
        target_x || null,
        target_y || null,
        target_z || null,
        width || null,
        height || null,
        penumbra,
      ]
    );

    // Get the created light
    const result = db.exec('SELECT * FROM lights ORDER BY id DESC LIMIT 1');
    const columns = result[0].columns;
    const row = result[0].values[0];
    const light = {};
    columns.forEach((col, idx) => {
      light[col] = row[idx];
    });

    saveDatabase();
    res.status(201).json({ light });
  } catch (error) {
    console.error('Error creating light:', error);
    res.status(500).json({ error: 'Failed to create light' });
  }
});

/**
 * PUT /api/lights/:id
 * Update a light
 */
router.put('/lights/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      name,
      position_x,
      position_y,
      position_z,
      intensity,
      color,
      cone_angle,
      distance,
      decay,
      cast_shadow,
      color_temperature,
      target_x,
      target_y,
      target_z,
      width,
      height,
      penumbra,
    } = req.body;

    const db = await getDatabase();

    // Verify light exists
    const checkResult = db.exec('SELECT id FROM lights WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Light not found' });
    }

    // Validate type if provided
    if (type && !LIGHT_TYPES.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid light type. Must be one of: ${LIGHT_TYPES.join(', ')}` 
      });
    }

    db.run(
      `UPDATE lights SET
        type = COALESCE(?, type),
        name = COALESCE(?, name),
        position_x = COALESCE(?, position_x),
        position_y = COALESCE(?, position_y),
        position_z = COALESCE(?, position_z),
        intensity = COALESCE(?, intensity),
        color = COALESCE(?, color),
        cone_angle = COALESCE(?, cone_angle),
        distance = COALESCE(?, distance),
        decay = COALESCE(?, decay),
        cast_shadow = COALESCE(?, cast_shadow),
        color_temperature = COALESCE(?, color_temperature),
        target_x = COALESCE(?, target_x),
        target_y = COALESCE(?, target_y),
        target_z = COALESCE(?, target_z),
        width = COALESCE(?, width),
        height = COALESCE(?, height),
        penumbra = COALESCE(?, penumbra)
      WHERE id = ?`,
      [
        type || null,
        name || null,
        position_x !== undefined ? position_x : null,
        position_y !== undefined ? position_y : null,
        position_z !== undefined ? position_z : null,
        intensity !== undefined ? intensity : null,
        color || null,
        cone_angle !== undefined ? cone_angle : null,
        distance !== undefined ? distance : null,
        decay !== undefined ? decay : null,
        cast_shadow !== undefined ? (cast_shadow ? 1 : 0) : null,
        color_temperature !== undefined ? color_temperature : null,
        target_x !== undefined ? target_x : null,
        target_y !== undefined ? target_y : null,
        target_z !== undefined ? target_z : null,
        width !== undefined ? width : null,
        height !== undefined ? height : null,
        penumbra !== undefined ? penumbra : null,
        parseInt(id),
      ]
    );

    saveDatabase();

    // Get updated light
    const result = db.exec('SELECT * FROM lights WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const light = {};
    columns.forEach((col, idx) => {
      light[col] = row[idx];
    });

    res.json({ light });
  } catch (error) {
    console.error('Error updating light:', error);
    res.status(500).json({ error: 'Failed to update light' });
  }
});

/**
 * DELETE /api/lights/:id
 * Delete a light
 */
router.delete('/lights/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    // Verify light exists
    const checkResult = db.exec('SELECT id FROM lights WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Light not found' });
    }

    db.run('DELETE FROM lights WHERE id = ?', [parseInt(id)]);
    saveDatabase();

    res.json({ message: 'Light deleted successfully' });
  } catch (error) {
    console.error('Error deleting light:', error);
    res.status(500).json({ error: 'Failed to delete light' });
  }
});

export default router;
