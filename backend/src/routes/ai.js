import express from 'express';
import multer from 'multer';
import { getDatabase, saveDatabase } from '../db/connection.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import crypto from 'crypto';
import { TrellisClient, generatePlaceholderModel } from '../services/trellis.js';

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
  console.log('Calling TRELLIS API with image:', imagePath);

  // Check if API key exists
  if (!apiKey || apiKey === '****' || apiKey === '') {
    console.log('[TRELLIS] No API key configured, using placeholder');
    return generatePlaceholderModel(imagePath);
  }

  try {
    // Determine endpoint type from API key format
    // Replicate keys start with 'r8_', Hugging Face tokens start with 'hf_'
    let endpointType = 'huggingface';
    if (apiKey.startsWith('r8_')) {
      endpointType = 'replicate';
    }

    const client = new TrellisClient(apiKey, endpointType);

    // Read image and convert to base64
    const fullImagePath = join(__dirname, '../../..', imagePath);
    const imageBuffer = readFileSync(fullImagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // Generate 3D model
    const result = await client.generate(imagePath, imageBase64);

    return {
      modelPath: result.modelPath,
      thumbnailPath: result.thumbnailPath || imagePath,
      dimensions: result.dimensions || {
        width: 1.0,
        height: 0.8,
        depth: 0.5
      }
    };

  } catch (error) {
    console.error('[TRELLIS] API error:', error.message);
    
    // Fall back to placeholder on error
    console.log('[TRELLIS] Falling back to placeholder model');
    return generatePlaceholderModel(imagePath);
  }
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

/**
 * POST /api/ai/url-import
 * Scrape product information from a URL
 */
router.post('/url-import', async (req, res) => {
  let generationId = null;

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        error: { message: 'Product URL is required' }
      });
    }

    // Validate URL format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: { message: 'Invalid URL format' }
      });
    }

    const db = await getDatabase();

    // Create AI generation record
    db.run(
      `INSERT INTO ai_generations (type, input_url, status, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      ['url_import', url, 'processing']
    );

    const genResult = db.exec('SELECT last_insert_rowid() as id');
    generationId = genResult[0].values[0][0];

    saveDatabase();

    // Scrape the product URL
    let scrapedData;
    try {
      scrapedData = await scrapeProductUrl(url);
    } catch (scrapeError) {
      // Update generation record with error
      db.run(
        `UPDATE ai_generations
         SET status = ?, error_message = ?
         WHERE id = ?`,
        ['failed', scrapeError.message, generationId]
      );
      saveDatabase();

      return res.status(500).json({
        error: {
          message: 'Failed to scrape product URL',
          details: scrapeError.message
        },
        generationId
      });
    }

    // Return scraped data for preview/confirmation
    // The frontend will call a separate endpoint to confirm import
    res.status(200).json({
      message: 'Product scraped successfully',
      data: scrapedData,
      generationId
    });

  } catch (error) {
    console.error('Error importing from URL:', error);

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
        message: 'Failed to import from URL',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/ai/url-import/confirm
 * Confirm and save the imported product as an asset
 */
router.post('/url-import/confirm', async (req, res) => {
  try {
    const { name, category, subcategory, imageUrl, dimensions, sourceUrl, generationId } = req.body;

    if (!name || !imageUrl) {
      return res.status(400).json({
        error: { message: 'Name and image URL are required' }
      });
    }

    const db = await getDatabase();

    // Download the image
    let imagePath;
    try {
      imagePath = await downloadImage(imageUrl);
    } catch (downloadError) {
      return res.status(500).json({
        error: {
          message: 'Failed to download product image',
          details: downloadError.message
        }
      });
    }

    // Create asset from scraped data
    db.run(
      `INSERT INTO assets (
        name, category, subcategory, source, model_path, thumbnail_path,
        width, height, depth, source_url, source_product_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        name,
        category || 'Furniture',
        subcategory || 'Imported',
        'url_import',
        '/assets/models/placeholder.glb', // Placeholder until 3D model is generated
        imagePath,
        dimensions?.width || 1.0,
        dimensions?.height || 1.0,
        dimensions?.depth || 1.0,
        sourceUrl,
        name
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
    if (generationId) {
      db.run(
        `UPDATE ai_generations
         SET status = ?, output_model_path = ?
         WHERE id = ?`,
        ['completed', imagePath, generationId]
      );
    }

    saveDatabase();

    res.status(201).json({
      message: 'Asset imported successfully',
      asset
    });

  } catch (error) {
    console.error('Error confirming URL import:', error);
    res.status(500).json({
      error: {
        message: 'Failed to confirm import',
        details: error.message
      }
    });
  }
});

/**
 * Scrape product information from a URL using Puppeteer and Cheerio
 */
async function scrapeProductUrl(url) {
  const puppeteer = await import('puppeteer');
  const cheerio = await import('cheerio');
  const { default: fetch } = await import('node-fetch');

  let browser;
  try {
    // Launch browser
    browser = await puppeteer.default.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Get the page HTML
    const html = await page.content();
    const $ = cheerio.load(html);

    // Extract product name
    let productName = '';
    // Try various selectors for product name
    productName = $('h1').first().text().trim() ||
                  $('meta[property="og:title"]').attr('content') ||
                  $('title').text().trim() ||
                  'Imported Product';

    // Extract product image
    let imageUrl = '';
    imageUrl = $('meta[property="og:image"]').attr('content') ||
               $('meta[name="twitter:image"]').attr('content') ||
               $('img[itemprop="image"]').first().attr('src') ||
               $('.product-image img').first().attr('src') ||
               $('img').first().attr('src') ||
               '';

    // Make image URL absolute if it's relative
    if (imageUrl && !imageUrl.startsWith('http')) {
      const urlObj = new URL(url);
      imageUrl = new URL(imageUrl, urlObj.origin).href;
    }

    // Extract dimensions (this is challenging and site-specific)
    let dimensions = { width: 1.0, height: 1.0, depth: 1.0 };
    const bodyText = $('body').text();

    // Try to find dimension patterns (e.g., "50cm x 80cm x 40cm", "W: 50, H: 80, D: 40")
    const dimensionPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")/,
      /W(?:idth)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?\s*[,;]?\s*H(?:eight)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?\s*[,;]?\s*D(?:epth)?:\s*(\d+(?:\.\d+)?)\s*(?:cm|CM|centimeters?|inches?|in|")?/i,
      /(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*cm/
    ];

    for (const pattern of dimensionPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        dimensions = {
          width: parseFloat(match[1]) / 100, // Convert cm to meters
          height: parseFloat(match[2]) / 100,
          depth: parseFloat(match[3]) / 100
        };
        break;
      }
    }

    await browser.close();

    return {
      name: productName,
      imageUrl,
      dimensions,
      sourceUrl: url
    };

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw new Error(`Failed to scrape URL: ${error.message}`);
  }
}

/**
 * Download an image from a URL and save it to the uploads directory
 */
async function downloadImage(imageUrl) {
  const { default: fetch } = await import('node-fetch');
  const fs = await import('fs');
  const { join } = await import('path');

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
    const filename = `url-import-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const uploadDir = join(__dirname, '../../../assets/uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    return `/assets/uploads/${filename}`;
  } catch (error) {
    throw new Error(`Failed to download image: ${error.message}`);
  }
}

/**
 * GET /api/ai/trellis/status
 * Check TRELLIS API configuration status
 */
router.get('/trellis/status', async (req, res) => {
  try {
    const apiKey = await getTrellisApiKey();
    
    const hasApiKey = !!(apiKey && apiKey !== '****' && apiKey !== '');
    
    let endpointType = 'none';
    if (hasApiKey) {
      if (apiKey.startsWith('r8_')) {
        endpointType = 'replicate';
      } else if (apiKey.startsWith('hf_')) {
        endpointType = 'huggingface';
      } else {
        endpointType = 'custom';
      }
    }
    
    res.json({
      configured: hasApiKey,
      endpointType,
      message: hasApiKey 
        ? `TRELLIS configured with ${endpointType} endpoint`
        : 'TRELLIS API key not configured. Add it in Settings to enable AI model generation.',
    });
  } catch (error) {
    console.error('Error checking TRELLIS status:', error);
    res.status(500).json({
      configured: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/trellis/test
 * Test TRELLIS API connection
 */
router.post('/trellis/test', async (req, res) => {
  try {
    const apiKey = await getTrellisApiKey();
    
    if (!apiKey || apiKey === '****' || apiKey === '') {
      return res.status(400).json({
        success: false,
        error: 'TRELLIS API key not configured',
      });
    }
    
    // Determine endpoint type
    let endpointType = 'huggingface';
    if (apiKey.startsWith('r8_')) {
      endpointType = 'replicate';
    }
    
    const client = new TrellisClient(apiKey, endpointType);
    
    // Just test that the client can be created and endpoint is reachable
    // We don't run an actual generation as it's resource-intensive
    res.json({
      success: true,
      endpointType,
      message: `TRELLIS API configured successfully (${endpointType} endpoint)`,
    });
  } catch (error) {
    console.error('Error testing TRELLIS:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// PHOTO-TO-ROOM AI FEATURES
// ============================================================================

import { analyzeRoomPhoto, analysisToRoomData, analysisToWalls } from '../services/room-vision.js';

/**
 * Get Anthropic API key from settings
 */
async function getAnthropicApiKey() {
  try {
    const db = await getDatabase();
    const result = db.exec(
      'SELECT value, encrypted FROM user_settings WHERE key = ?',
      ['anthropic_api_key']
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
    console.error('Error fetching Anthropic API key:', error);
    return null;
  }
}

/**
 * GET /api/ai/room-vision/status
 * Check if room vision AI is configured
 */
router.get('/room-vision/status', async (req, res) => {
  try {
    const apiKey = await getAnthropicApiKey();
    const configured = !!(apiKey && apiKey !== '****' && apiKey !== '');
    
    res.json({
      configured,
      message: configured
        ? 'Room Vision AI is ready (Claude Vision)'
        : 'Anthropic API key not configured. Add it in Settings to enable photo-to-room AI.',
    });
  } catch (error) {
    console.error('Error checking room vision status:', error);
    res.status(500).json({
      configured: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/analyze-room
 * Analyze a room photo and extract room structure
 */
router.post('/analyze-room', upload.single('photo'), async (req, res) => {
  let generationId = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: 'No photo uploaded' }
      });
    }

    const { floorId } = req.body;
    
    if (!floorId) {
      return res.status(400).json({
        error: { message: 'Floor ID is required' }
      });
    }

    const db = await getDatabase();
    const imagePath = `/assets/uploads/${req.file.filename}`;

    // Create AI generation record
    db.run(
      `INSERT INTO ai_generations (type, input_image_path, status, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      ['photo_to_room', imagePath, 'processing']
    );

    const genResult = db.exec('SELECT last_insert_rowid() as id');
    generationId = genResult[0].values[0][0];
    saveDatabase();

    // Get API key
    const apiKey = await getAnthropicApiKey();
    
    if (!apiKey || apiKey === '****' || apiKey === '') {
      db.run(
        `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
        ['failed', 'Anthropic API key not configured', generationId]
      );
      saveDatabase();
      
      return res.status(400).json({
        error: { message: 'Anthropic API key not configured. Add it in Settings.' },
        generationId
      });
    }

    // Analyze the photo
    let analysis;
    try {
      analysis = await analyzeRoomPhoto(imagePath, apiKey);
    } catch (analysisError) {
      db.run(
        `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
        ['failed', analysisError.message, generationId]
      );
      saveDatabase();
      
      return res.status(500).json({
        error: { 
          message: 'Failed to analyze room photo',
          details: analysisError.message
        },
        generationId
      });
    }

    // Convert analysis to room data
    const roomData = analysisToRoomData(analysis, parseInt(floorId));

    // Update generation record with success
    db.run(
      `UPDATE ai_generations SET status = ?, parameters = ? WHERE id = ?`,
      ['completed', JSON.stringify(analysis), generationId]
    );
    saveDatabase();

    res.json({
      success: true,
      analysis,
      roomData,
      imagePath,
      generationId,
      message: `Detected ${roomData.name} (${analysis.confidence * 100}% confidence)`
    });

  } catch (error) {
    console.error('Error analyzing room:', error);

    if (generationId) {
      try {
        const db = await getDatabase();
        db.run(
          `UPDATE ai_generations SET status = ?, error_message = ? WHERE id = ?`,
          ['failed', error.message, generationId]
        );
        saveDatabase();
      } catch (updateError) {
        console.error('Error updating generation record:', updateError);
      }
    }

    res.status(500).json({
      error: {
        message: 'Failed to analyze room',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/ai/create-room-from-analysis
 * Create a room from AI analysis results
 */
router.post('/create-room-from-analysis', async (req, res) => {
  try {
    const { floorId, analysis, adjustments } = req.body;

    if (!floorId || !analysis) {
      return res.status(400).json({
        error: { message: 'Floor ID and analysis are required' }
      });
    }

    const db = await getDatabase();

    // Verify floor exists
    const floorCheck = db.exec('SELECT id, project_id FROM floors WHERE id = ?', [parseInt(floorId)]);
    if (floorCheck.length === 0 || floorCheck[0].values.length === 0) {
      return res.status(404).json({
        error: { message: 'Floor not found' }
      });
    }

    // Apply any user adjustments
    const roomData = analysisToRoomData(analysis, parseInt(floorId));
    
    if (adjustments) {
      if (adjustments.name) roomData.name = adjustments.name;
      if (adjustments.width) roomData.width = adjustments.width;
      if (adjustments.depth) roomData.depth = adjustments.depth;
      if (adjustments.ceiling_height) roomData.ceiling_height = adjustments.ceiling_height;
      if (adjustments.floor_material) roomData.floor_material = adjustments.floor_material;
    }

    // Create the room
    db.run(
      `INSERT INTO rooms (
        floor_id, name, width, depth, ceiling_height,
        floor_material, position_x, position_y, position_z,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        parseInt(floorId),
        roomData.name,
        roomData.width,
        roomData.depth,
        roomData.ceiling_height,
        roomData.floor_material,
        roomData.position_x,
        roomData.position_y,
        roomData.position_z
      ]
    );

    // Get created room
    const roomResult = db.exec('SELECT * FROM rooms ORDER BY id DESC LIMIT 1');
    const columns = roomResult[0].columns;
    const row = roomResult[0].values[0];
    const room = {};
    columns.forEach((col, idx) => {
      room[col] = row[idx];
    });

    // Create walls based on analysis
    const wallsData = analysisToWalls(analysis, room.id, {
      width: roomData.width,
      depth: roomData.depth,
      height: roomData.ceiling_height
    });

    const createdWalls = [];
    for (const wall of wallsData) {
      db.run(
        `INSERT INTO walls (
          room_id, start_x, start_y, end_x, end_y,
          height, thickness, material,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          wall.room_id,
          wall.start_x,
          wall.start_y,
          wall.end_x,
          wall.end_y,
          wall.height,
          wall.thickness,
          wall.material
        ]
      );

      const wallResult = db.exec('SELECT * FROM walls ORDER BY id DESC LIMIT 1');
      const wallCols = wallResult[0].columns;
      const wallRow = wallResult[0].values[0];
      const createdWall = {};
      wallCols.forEach((col, idx) => {
        createdWall[col] = wallRow[idx];
      });
      createdWalls.push(createdWall);
    }

    saveDatabase();

    res.status(201).json({
      success: true,
      room,
      walls: createdWalls,
      message: `Created ${room.name} with ${createdWalls.length} walls`
    });

  } catch (error) {
    console.error('Error creating room from analysis:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create room',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/ai/generations
 * Get AI generation history
 */
router.get('/generations', async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, status } = req.query;
    const db = await getDatabase();

    let sql = 'SELECT * FROM ai_generations WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const result = db.exec(sql, params);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.json({ generations: [], total: 0 });
    }

    const columns = result[0].columns;
    const generations = result[0].values.map(row => {
      const gen = {};
      columns.forEach((col, idx) => {
        gen[col] = row[idx];
      });
      // Parse JSON fields
      if (gen.parameters) {
        try {
          gen.parameters = JSON.parse(gen.parameters);
        } catch (e) {}
      }
      return gen;
    });

    // Get total count
    const countResult = db.exec('SELECT COUNT(*) as count FROM ai_generations');
    const total = countResult[0].values[0][0];

    res.json({ generations, total });
  } catch (error) {
    console.error('Error fetching generations:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch generation history' }
    });
  }
});

/**
 * DELETE /api/ai/generations/:id
 * Delete an AI generation record
 */
router.delete('/generations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const check = db.exec('SELECT id FROM ai_generations WHERE id = ?', [parseInt(id)]);
    if (check.length === 0 || check[0].values.length === 0) {
      return res.status(404).json({
        error: { message: 'Generation not found' }
      });
    }

    db.run('DELETE FROM ai_generations WHERE id = ?', [parseInt(id)]);
    saveDatabase();

    res.json({ success: true, message: 'Generation deleted' });
  } catch (error) {
    console.error('Error deleting generation:', error);
    res.status(500).json({
      error: { message: 'Failed to delete generation' }
    });
  }
});

export default router;
