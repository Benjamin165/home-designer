import express from 'express';
import multer from 'multer';
import { getDatabase, saveDatabase } from '../db/connection.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import crypto from 'crypto';

const router = express.Router();

// Encryption key (should match settings.js)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'home-designer-default-key-32ch';
const IV_LENGTH = 16;

/**
 * Decrypt an encrypted string
 */
function decrypt(text) {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../../../assets/uploads');
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = file.originalname.split('.').pop();
    cb(null, `photo-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
    }
  }
});

/**
 * Get TRELLIS API key from settings
 */
async function getTrellisApiKey() {
  try {
    const db = await getDatabase();
    const result = db.exec(
      'SELECT value, encrypted FROM user_settings WHERE key = ?',
      ['trellis_api_key']
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    const value = result[0].values[0][0];
    const encrypted = result[0].values[0][1] === 1;

    if (encrypted) {
      return decrypt(value);
    }

    return value;
  } catch (error) {
    console.error('Error fetching TRELLIS API key:', error);
    return null;
  }
}

/**
 * Call Microsoft TRELLIS API to generate 3D model from photo
 */
async function callTrellisApi(imagePath, apiKey) {
  // TODO: Implement actual TRELLIS API integration
  // For now, this is a placeholder that simulates the API call

  console.log('Calling TRELLIS API with image:', imagePath);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if API key exists
  if (!apiKey || apiKey === '****') {
    throw new Error('TRELLIS API key not configured. Please add it in Settings.');
  }

  // Simulate successful generation
  // In real implementation, this would:
  // 1. Upload image to TRELLIS
  // 2. Poll for generation status
  // 3. Download the generated 3D model
  // 4. Save it to assets/models/

  const modelId = crypto.randomBytes(8).toString('hex');
  const modelPath = `/assets/models/generated-${modelId}.glb`;
  const thumbnailPath = imagePath; // Use uploaded image as thumbnail for now

  return {
    modelPath,
    thumbnailPath,
    dimensions: {
      width: 1.0,
      height: 0.8,
      depth: 0.5
    }
  };
}

/**
 * POST /api/ai/generate-from-photo
 * Generate a 3D furniture model from a photo
 */
router.post('/generate-from-photo', upload.single('photo'), async (req, res) => {
  let generationId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'No photo uploaded' }
      });
    }

    const { name, category, subcategory } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { message: 'Asset name is required' }
      });
    }

    const db = await getDatabase();
    const imagePath = `/assets/uploads/${req.file.filename}`;

    // Create AI generation record
    db.run(
      `INSERT INTO ai_generations (type, input_image_path, status, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      ['photo_to_furniture', imagePath, 'processing']
    );

    const genResult = db.exec('SELECT last_insert_rowid() as id');
    generationId = genResult[0].values[0][0];

    saveDatabase();

    // Get TRELLIS API key
    const apiKey = await getTrellisApiKey();

    // Call TRELLIS API
    let trellisResult;
    try {
      trellisResult = await callTrellisApi(imagePath, apiKey);
    } catch (apiError) {
      // Update generation record with error
      db.run(
        `UPDATE ai_generations
         SET status = ?, error_message = ?
         WHERE id = ?`,
        ['failed', apiError.message, generationId]
      );
      saveDatabase();

      return res.status(500).json({
        error: {
          message: 'AI generation failed',
          details: apiError.message
        },
        generationId
      });
    }

    // Create asset from generated model
    db.run(
      `INSERT INTO assets (
        name, category, subcategory, source, model_path, thumbnail_path,
        width, height, depth, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        name,
        category || 'Furniture',
        subcategory || 'Generated',
        'generated',
        trellisResult.modelPath,
        trellisResult.thumbnailPath,
        trellisResult.dimensions.width,
        trellisResult.dimensions.height,
        trellisResult.dimensions.depth
      ]
    );

    const assetResult = db.exec('SELECT * FROM assets ORDER BY id DESC LIMIT 1');
    const columns = assetResult[0].columns;
    const row = assetResult[0].values[0];
    const asset = {};
    columns.forEach((col, idx) => {
      asset[col] = row[idx];
    });

    // Update generation record with success
    db.run(
      `UPDATE ai_generations
       SET status = ?, output_model_path = ?
       WHERE id = ?`,
      ['completed', trellisResult.modelPath, generationId]
    );

    saveDatabase();

    res.status(201).json({
      message: 'Model generated successfully',
      asset,
      generationId
    });

  } catch (error) {
    console.error('Error generating model from photo:', error);

    // Update generation record with error if we have the ID
    if (generationId) {
      try {
        const db = await getDatabase();
        db.run(
          `UPDATE ai_generations
           SET status = ?, error_message = ?
           WHERE id = ?`,
          ['failed', error.message, generationId]
        );
        saveDatabase();
      } catch (updateError) {
        console.error('Error updating generation record:', updateError);
      }
    }

    res.status(500).json({
      error: {
        message: 'Failed to generate model',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/ai/generation/:id
 * Get status of an AI generation
 */
router.get('/generation/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const result = db.exec(
      'SELECT * FROM ai_generations WHERE id = ?',
      [parseInt(id)]
    );

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({
        error: { message: 'Generation not found' }
      });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const generation = {};
    columns.forEach((col, idx) => {
      generation[col] = row[idx];
    });

    res.json({ generation });
  } catch (error) {
    console.error('Error fetching generation:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch generation' }
    });
  }
});

export default router;
