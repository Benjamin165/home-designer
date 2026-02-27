import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

/**
 * POST /api/rooms/merge
 * Merge two adjacent rooms into one
 */
router.post('/rooms/merge', async (req, res) => {
  try {
    const { roomIds } = req.body;

    if (!roomIds || !Array.isArray(roomIds) || roomIds.length !== 2) {
      return res.status(400).json({ error: 'Exactly two room IDs are required' });
    }

    const db = await getDatabase();

    // Get both rooms
    const rooms = [];
    for (const id of roomIds) {
      const result = db.exec('SELECT * FROM rooms WHERE id = ?', [parseInt(id)]);
      if (result.length === 0 || result[0].values.length === 0) {
        return res.status(404).json({ error: `Room ${id} not found` });
      }
      const columns = result[0].columns;
      const row = result[0].values[0];
      const room = {};
      columns.forEach((col, idx) => {
        room[col] = row[idx];
      });
      if (room.dimensions_json) {
        room.dimensions_json = JSON.parse(room.dimensions_json);
      }
      rooms.push(room);
    }

    // Verify rooms are on the same floor
    if (rooms[0].floor_id !== rooms[1].floor_id) {
      return res.status(400).json({ error: 'Rooms must be on the same floor to merge' });
    }

    // Calculate merged room dimensions
    const r1 = rooms[0];
    const r2 = rooms[1];

    // Get bounding box of both rooms
    const r1MinX = r1.position_x - r1.dimensions_json.width / 2;
    const r1MaxX = r1.position_x + r1.dimensions_json.width / 2;
    const r1MinZ = r1.position_z - r1.dimensions_json.depth / 2;
    const r1MaxZ = r1.position_z + r1.dimensions_json.depth / 2;

    const r2MinX = r2.position_x - r2.dimensions_json.width / 2;
    const r2MaxX = r2.position_x + r2.dimensions_json.width / 2;
    const r2MinZ = r2.position_z - r2.dimensions_json.depth / 2;
    const r2MaxZ = r2.position_z + r2.dimensions_json.depth / 2;

    const minX = Math.min(r1MinX, r2MinX);
    const maxX = Math.max(r1MaxX, r2MaxX);
    const minZ = Math.min(r1MinZ, r2MinZ);
    const maxZ = Math.max(r1MaxZ, r2MaxZ);

    const newWidth = maxX - minX;
    const newDepth = maxZ - minZ;
    const newPosX = (minX + maxX) / 2;
    const newPosZ = (minZ + maxZ) / 2;
    const newCeilingHeight = Math.max(r1.ceiling_height, r2.ceiling_height);

    // Update first room with merged dimensions
    db.run(
      `UPDATE rooms SET
        name = ?,
        dimensions_json = ?,
        position_x = ?,
        position_z = ?,
        ceiling_height = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        `${r1.name || 'Room'} + ${r2.name || 'Room'}`,
        JSON.stringify({ width: newWidth, depth: newDepth }),
        newPosX,
        newPosZ,
        newCeilingHeight,
        r1.id,
      ]
    );

    // Move furniture from second room to first
    db.run(
      'UPDATE furniture_placements SET room_id = ? WHERE room_id = ?',
      [r1.id, r2.id]
    );

    // Move lights from second room to first
    db.run(
      'UPDATE lights SET room_id = ? WHERE room_id = ?',
      [r1.id, r2.id]
    );

    // Delete the second room (walls will cascade delete)
    db.run('DELETE FROM rooms WHERE id = ?', [r2.id]);

    saveDatabase();

    // Get the merged room
    const result = db.exec('SELECT * FROM rooms WHERE id = ?', [r1.id]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const mergedRoom = {};
    columns.forEach((col, idx) => {
      mergedRoom[col] = row[idx];
    });
    if (mergedRoom.dimensions_json) {
      mergedRoom.dimensions_json = JSON.parse(mergedRoom.dimensions_json);
    }

    res.json({
      success: true,
      room: mergedRoom,
      deletedRoomId: r2.id,
    });

  } catch (error) {
    console.error('Error merging rooms:', error);
    res.status(500).json({ error: error.message || 'Failed to merge rooms' });
  }
});

/**
 * POST /api/rooms/:id/split
 * Split a room into two with a new wall
 */
router.post('/rooms/:id/split', async (req, res) => {
  try {
    const { id } = req.params;
    const { axis, position } = req.body; // axis: 'x' or 'z', position: 0-1 (percentage)

    if (!axis || position === undefined) {
      return res.status(400).json({ error: 'Axis and position are required' });
    }

    if (!['x', 'z'].includes(axis)) {
      return res.status(400).json({ error: 'Axis must be "x" or "z"' });
    }

    const splitPosition = parseFloat(position);
    if (isNaN(splitPosition) || splitPosition <= 0 || splitPosition >= 1) {
      return res.status(400).json({ error: 'Position must be between 0 and 1 (exclusive)' });
    }

    const db = await getDatabase();

    // Get the room
    const result = db.exec('SELECT * FROM rooms WHERE id = ?', [parseInt(id)]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const room = {};
    columns.forEach((col, idx) => {
      room[col] = row[idx];
    });
    if (room.dimensions_json) {
      room.dimensions_json = JSON.parse(room.dimensions_json);
    }

    const width = room.dimensions_json.width;
    const depth = room.dimensions_json.depth;
    const posX = room.position_x;
    const posZ = room.position_z;

    let room1, room2;

    if (axis === 'x') {
      // Split vertically (creates left and right rooms)
      const splitX = posX - width / 2 + width * splitPosition;
      const width1 = width * splitPosition;
      const width2 = width * (1 - splitPosition);

      room1 = {
        width: width1,
        depth: depth,
        posX: posX - width / 2 + width1 / 2,
        posZ: posZ,
      };
      room2 = {
        width: width2,
        depth: depth,
        posX: posX + width / 2 - width2 / 2,
        posZ: posZ,
      };
    } else {
      // Split horizontally (creates front and back rooms)
      const splitZ = posZ - depth / 2 + depth * splitPosition;
      const depth1 = depth * splitPosition;
      const depth2 = depth * (1 - splitPosition);

      room1 = {
        width: width,
        depth: depth1,
        posX: posX,
        posZ: posZ - depth / 2 + depth1 / 2,
      };
      room2 = {
        width: width,
        depth: depth2,
        posX: posX,
        posZ: posZ + depth / 2 - depth2 / 2,
      };
    }

    // Update original room with first half
    db.run(
      `UPDATE rooms SET
        name = ?,
        dimensions_json = ?,
        position_x = ?,
        position_z = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        `${room.name || 'Room'} A`,
        JSON.stringify({ width: room1.width, depth: room1.depth }),
        room1.posX,
        room1.posZ,
        room.id,
      ]
    );

    // Create second room
    db.run(
      `INSERT INTO rooms (
        floor_id, name, dimensions_json,
        position_x, position_y, position_z,
        ceiling_height, floor_material, floor_color,
        ceiling_material, ceiling_color,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        room.floor_id,
        `${room.name || 'Room'} B`,
        JSON.stringify({ width: room2.width, depth: room2.depth }),
        room2.posX,
        room.position_y || 0,
        room2.posZ,
        room.ceiling_height,
        room.floor_material,
        room.floor_color,
        room.ceiling_material,
        room.ceiling_color,
      ]
    );

    saveDatabase();

    // Get both rooms
    const rooms = [];
    const r1Result = db.exec('SELECT * FROM rooms WHERE id = ?', [room.id]);
    const r2Result = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');

    for (const res of [r1Result, r2Result]) {
      const cols = res[0].columns;
      const r = res[0].values[0];
      const roomData = {};
      cols.forEach((col, idx) => {
        roomData[col] = r[idx];
      });
      if (roomData.dimensions_json) {
        roomData.dimensions_json = JSON.parse(roomData.dimensions_json);
      }
      rooms.push(roomData);
    }

    res.json({
      success: true,
      rooms: rooms,
    });

  } catch (error) {
    console.error('Error splitting room:', error);
    res.status(500).json({ error: error.message || 'Failed to split room' });
  }
});

/**
 * PUT /api/walls/thickness
 * Update wall thickness for a room's walls
 */
router.put('/rooms/:id/wall-thickness', async (req, res) => {
  try {
    const { id } = req.params;
    const { thickness } = req.body;

    if (thickness === undefined || thickness < 0.05 || thickness > 1.0) {
      return res.status(400).json({ error: 'Thickness must be between 0.05 and 1.0 meters' });
    }

    const db = await getDatabase();

    // Update all walls for this room
    db.run(
      'UPDATE walls SET thickness = ? WHERE room_id = ?',
      [thickness, parseInt(id)]
    );

    saveDatabase();

    res.json({
      success: true,
      roomId: parseInt(id),
      thickness,
    });

  } catch (error) {
    console.error('Error updating wall thickness:', error);
    res.status(500).json({ error: error.message || 'Failed to update wall thickness' });
  }
});

export default router;
