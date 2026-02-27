import express from 'express';
import multer from 'multer';
import { getDatabase, saveDatabase } from '../db/connection.js';
import { saveFloorPlanImage, calculateScale, wallsToRooms } from '../services/floorplan.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for floor plan uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload PNG, JPG, or WebP.'));
    }
  },
});

/**
 * POST /api/floors/:floorId/floorplan
 * Upload a floor plan image for a floor
 */
router.post('/floors/:floorId/floorplan', upload.single('image'), async (req, res) => {
  try {
    const { floorId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const db = await getDatabase();

    // Verify floor exists
    const floorCheck = db.exec('SELECT id, project_id FROM floors WHERE id = ?', [parseInt(floorId)]);
    if (floorCheck.length === 0 || floorCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    // Save the image
    const { path: imagePath } = await saveFloorPlanImage(
      req.file.buffer,
      req.file.originalname
    );

    // Store reference in database (add column if needed via migration)
    // For now, we'll return the path and let frontend handle it
    
    res.json({
      success: true,
      imagePath,
      floorId: parseInt(floorId),
    });

  } catch (error) {
    console.error('Error uploading floor plan:', error);
    res.status(500).json({ error: error.message || 'Failed to upload floor plan' });
  }
});

/**
 * POST /api/floors/:floorId/floorplan/scale
 * Set the scale for a floor plan image
 */
router.post('/floors/:floorId/floorplan/scale', async (req, res) => {
  try {
    const { floorId } = req.params;
    const { line, realLength } = req.body;

    if (!line || !realLength) {
      return res.status(400).json({ error: 'Line and realLength are required' });
    }

    // Calculate scale factor
    const scale = calculateScale(line, realLength);

    res.json({
      success: true,
      scale, // meters per pixel
      pixelsPerMeter: 1 / scale,
    });

  } catch (error) {
    console.error('Error calculating scale:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate scale' });
  }
});

/**
 * POST /api/floors/:floorId/floorplan/trace
 * Convert traced walls to room structures
 */
router.post('/floors/:floorId/floorplan/trace', async (req, res) => {
  try {
    const { floorId } = req.params;
    const { walls, scale, imageOffset } = req.body;

    if (!walls || !scale) {
      return res.status(400).json({ error: 'Walls and scale are required' });
    }

    const db = await getDatabase();

    // Verify floor exists
    const floorCheck = db.exec('SELECT id FROM floors WHERE id = ?', [parseInt(floorId)]);
    if (floorCheck.length === 0 || floorCheck[0].values.length === 0) {
      return res.status(404).json({ error: 'Floor not found' });
    }

    // Convert traced walls to room definitions
    const rooms = wallsToRooms(walls, scale, imageOffset);

    // Create rooms in database
    const createdRooms = [];
    for (const room of rooms) {
      db.run(
        `INSERT INTO rooms (
          floor_id, name, dimensions_json,
          position_x, position_y, position_z,
          ceiling_height, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          parseInt(floorId),
          room.name,
          JSON.stringify(room.dimensions),
          room.position.x,
          0,
          room.position.z,
          2.8, // Default ceiling height
        ]
      );

      // Get created room
      const result = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');
      if (result.length > 0 && result[0].values.length > 0) {
        const columns = result[0].columns;
        const row = result[0].values[0];
        const createdRoom = {};
        columns.forEach((col, idx) => {
          createdRoom[col] = row[idx];
        });
        if (createdRoom.dimensions_json) {
          createdRoom.dimensions_json = JSON.parse(createdRoom.dimensions_json);
        }
        createdRooms.push(createdRoom);
      }
    }

    saveDatabase();

    res.json({
      success: true,
      rooms: createdRooms,
      count: createdRooms.length,
    });

  } catch (error) {
    console.error('Error processing traced walls:', error);
    res.status(500).json({ error: error.message || 'Failed to process traced walls' });
  }
});

/**
 * POST /api/floors/:floorId/floorplan/detect
 * AI-assisted wall detection (placeholder)
 */
router.post('/floors/:floorId/floorplan/detect', upload.single('image'), async (req, res) => {
  try {
    // This would use computer vision to detect walls
    // For now, return empty - user must trace manually
    
    res.json({
      success: true,
      walls: [],
      message: 'AI wall detection not yet implemented. Please trace walls manually.',
    });

  } catch (error) {
    console.error('Error detecting walls:', error);
    res.status(500).json({ error: error.message || 'Failed to detect walls' });
  }
});

export default router;
