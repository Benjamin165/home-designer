import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// GET /api/floors/:floorId/rooms - List rooms on a floor
router.get('/floors/:floorId/rooms', async (req, res) => {
  try {
    const { floorId } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      'SELECT * FROM rooms WHERE floor_id = ? ORDER BY created_at ASC',
      [parseInt(floorId)]
    );

    let rooms = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      rooms = result[0].values.map(row => {
        const room = {};
        columns.forEach((col, idx) => {
          room[col] = row[idx];
        });
        // Parse dimensions_json if it's a string
        if (room.dimensions_json && typeof room.dimensions_json === 'string') {
          try {
            room.dimensions_json = JSON.parse(room.dimensions_json);
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
        return room;
      });
    }

    res.json({ rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// POST /api/floors/:floorId/rooms - Create a new room
router.post('/floors/:floorId/rooms', async (req, res) => {
  try {
    const { floorId } = req.params;
    const {
      name,
      dimensions_json,
      floor_material,
      floor_color,
      floor_texture_path,
      ceiling_height,
      ceiling_material,
      ceiling_color,
      position_x,
      position_y,
      position_z
    } = req.body;

    if (!dimensions_json) {
      return res.status(400).json({ error: 'dimensions_json is required' });
    }

    const db = await getDatabase();

    // Verify floor exists
    const floorCheck = db.exec('SELECT id FROM floors WHERE id = ?', [parseInt(floorId)]);
    if (floorCheck.length === 0 || floorCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    // Convert dimensions_json to string if it's an object
    const dimensionsStr = typeof dimensions_json === 'string'
      ? dimensions_json
      : JSON.stringify(dimensions_json);

    // Insert room
    db.run(
      `INSERT INTO rooms (
        floor_id, name, dimensions_json, floor_material, floor_color, floor_texture_path,
        ceiling_height, ceiling_material, ceiling_color,
        position_x, position_y, position_z,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        parseInt(floorId),
        name || null,
        dimensionsStr,
        floor_material || null,
        floor_color || null,
        floor_texture_path || null,
        ceiling_height || 2.8,
        ceiling_material || null,
        ceiling_color || null,
        position_x || 0,
        position_y || 0,
        position_z || 0
      ]
    );

    // Get the inserted room
    const result = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const room = {};
      columns.forEach((col, idx) => {
        room[col] = row[idx];
      });

      // Parse dimensions_json
      if (room.dimensions_json && typeof room.dimensions_json === 'string') {
        try {
          room.dimensions_json = JSON.parse(room.dimensions_json);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      // Create 4 walls for the room (front, back, left, right)
      const dims = room.dimensions_json;
      const width = dims.width || 4;
      const depth = dims.depth || 4;
      const roomHeight = room.ceiling_height || 2.8;
      const defaultWallColor = '#e5e7eb';

      // Front wall (+Z direction)
      db.run(
        `INSERT INTO walls (room_id, start_x, start_y, end_x, end_y, height, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [room.id, -width / 2, depth / 2, width / 2, depth / 2, roomHeight, defaultWallColor]
      );

      // Back wall (-Z direction)
      db.run(
        `INSERT INTO walls (room_id, start_x, start_y, end_x, end_y, height, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [room.id, -width / 2, -depth / 2, width / 2, -depth / 2, roomHeight, defaultWallColor]
      );

      // Left wall (-X direction)
      db.run(
        `INSERT INTO walls (room_id, start_x, start_y, end_x, end_y, height, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [room.id, -width / 2, -depth / 2, -width / 2, depth / 2, roomHeight, defaultWallColor]
      );

      // Right wall (+X direction)
      db.run(
        `INSERT INTO walls (room_id, start_x, start_y, end_x, end_y, height, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [room.id, width / 2, -depth / 2, width / 2, depth / 2, roomHeight, defaultWallColor]
      );

      saveDatabase();
      res.status(201).json({ room });
    } else {
      throw new Error('Failed to retrieve created room');
    }
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT /api/rooms/:id - Update a room
router.put('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      dimensions_json,
      floor_material,
      floor_color,
      floor_texture_path,
      ceiling_height,
      ceiling_material,
      ceiling_color,
      position_x,
      position_y,
      position_z
    } = req.body;

    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM rooms WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Convert dimensions_json to string if provided and is an object
    const dimensionsStr = dimensions_json
      ? (typeof dimensions_json === 'string' ? dimensions_json : JSON.stringify(dimensions_json))
      : null;

    db.run(
      `UPDATE rooms
       SET name = COALESCE(?, name),
           dimensions_json = COALESCE(?, dimensions_json),
           floor_material = COALESCE(?, floor_material),
           floor_color = COALESCE(?, floor_color),
           floor_texture_path = COALESCE(?, floor_texture_path),
           ceiling_height = COALESCE(?, ceiling_height),
           ceiling_material = COALESCE(?, ceiling_material),
           ceiling_color = COALESCE(?, ceiling_color),
           position_x = COALESCE(?, position_x),
           position_y = COALESCE(?, position_y),
           position_z = COALESCE(?, position_z),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || null,
        dimensionsStr,
        floor_material || null,
        floor_color || null,
        floor_texture_path || null,
        ceiling_height !== undefined ? ceiling_height : null,
        ceiling_material || null,
        ceiling_color || null,
        position_x !== undefined ? position_x : null,
        position_y !== undefined ? position_y : null,
        position_z !== undefined ? position_z : null,
        parseInt(id)
      ]
    );

    saveDatabase();

    const result = db.exec('SELECT * FROM rooms WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const room = {};
    columns.forEach((col, idx) => {
      room[col] = row[idx];
    });

    // Parse dimensions_json
    if (room.dimensions_json && typeof room.dimensions_json === 'string') {
      try {
        room.dimensions_json = JSON.parse(room.dimensions_json);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    res.json({ room });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id - Delete a room
router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM rooms WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Explicitly delete related data (CASCADE DELETE should handle this, but we'll be explicit for reliability)
    // Delete furniture placements in this room
    db.run('DELETE FROM furniture_placements WHERE room_id = ?', [parseInt(id)]);

    // Delete lights in this room
    db.run('DELETE FROM lights WHERE room_id = ?', [parseInt(id)]);

    // Delete walls in this room (which will cascade to windows and doors)
    db.run('DELETE FROM walls WHERE room_id = ?', [parseInt(id)]);

    // Delete the room itself
    db.run('DELETE FROM rooms WHERE id = ?', [parseInt(id)]);

    saveDatabase();

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/rooms/:id/furniture - Get furniture in a room
router.get('/rooms/:id/furniture', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      `SELECT fp.*, a.name as asset_name, a.category, a.model_path, a.thumbnail_path,
              a.width, a.height, a.depth
       FROM furniture_placements fp
       JOIN assets a ON fp.asset_id = a.id
       WHERE fp.room_id = ?
       ORDER BY fp.created_at ASC`,
      [parseInt(id)]
    );

    let furniture = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      furniture = result[0].values.map(row => {
        const item = {};
        columns.forEach((col, idx) => {
          item[col] = row[idx];
        });
        return item;
      });
    }

    res.json({ furniture });
  } catch (error) {
    console.error('Error fetching furniture:', error);
    res.status(500).json({ error: 'Failed to fetch furniture' });
  }
});

export default router;
