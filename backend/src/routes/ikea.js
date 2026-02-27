/**
 * IKEA API Routes
 * 
 * Provides access to IKEA 3D furniture models from the official dataset.
 */

import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';
import {
  getIKEACatalog,
  searchIKEACatalog,
  getIKEAItem,
  downloadIKEAModel,
  getModelPath,
  importIKEAToAssets,
} from '../services/ikea.js';

const router = express.Router();

/**
 * GET /api/ikea/catalog
 * Get all available IKEA furniture items
 */
router.get('/catalog', (req, res) => {
  try {
    const catalog = getIKEACatalog();
    res.json({ items: catalog, count: catalog.length });
  } catch (error) {
    console.error('Error getting IKEA catalog:', error);
    res.status(500).json({ error: 'Failed to get IKEA catalog' });
  }
});

/**
 * GET /api/ikea/search
 * Search IKEA catalog
 */
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = searchIKEACatalog(q);
    res.json({ items: results, count: results.length });
  } catch (error) {
    console.error('Error searching IKEA catalog:', error);
    res.status(500).json({ error: 'Failed to search IKEA catalog' });
  }
});

/**
 * GET /api/ikea/items/:id
 * Get details for a specific IKEA item
 */
router.get('/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const item = getIKEAItem(id);
    
    if (!item) {
      return res.status(404).json({ error: 'IKEA item not found' });
    }
    
    res.json({ item });
  } catch (error) {
    console.error('Error getting IKEA item:', error);
    res.status(500).json({ error: 'Failed to get IKEA item' });
  }
});

/**
 * GET /api/ikea/models/:id
 * Download/serve a model file (OBJ format from IKEA dataset)
 */
router.get('/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if already cached
    let modelInfo = getModelPath(id);
    
    // Download if not cached
    if (!modelInfo) {
      const result = await downloadIKEAModel(id);
      modelInfo = { path: result.objPath, format: 'obj' };
    }
    
    // Set content type based on format
    const contentType = modelInfo.format === 'glb' ? 'model/gltf-binary' : 'text/plain';
    res.setHeader('Content-Type', contentType);
    
    // Serve the file
    res.sendFile(modelInfo.path);
  } catch (error) {
    console.error('Error serving IKEA model:', error);
    res.status(500).json({ error: error.message || 'Failed to get IKEA model' });
  }
});

/**
 * POST /api/ikea/import/:id
 * Import an IKEA item into the assets database
 */
router.post('/import/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();
    
    const assetId = await importIKEAToAssets(db, id);
    saveDatabase();
    
    // Get the imported asset
    const result = db.exec('SELECT * FROM assets WHERE id = ?', [assetId]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const asset = {};
    columns.forEach((col, idx) => {
      asset[col] = row[idx];
    });
    
    res.json({
      success: true,
      asset,
      message: `Imported ${id} to assets library`,
    });
  } catch (error) {
    console.error('Error importing IKEA item:', error);
    res.status(500).json({ error: error.message || 'Failed to import IKEA item' });
  }
});

/**
 * POST /api/ikea/import-all
 * Import all IKEA items into the assets database
 */
router.post('/import-all', async (req, res) => {
  try {
    const db = await getDatabase();
    const catalog = getIKEACatalog();
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of catalog) {
      try {
        const assetId = await importIKEAToAssets(db, item.id);
        results.push({ id: item.id, success: true, assetId });
        successCount++;
      } catch (error) {
        results.push({ id: item.id, success: false, error: error.message });
        errorCount++;
      }
    }
    
    saveDatabase();
    
    res.json({
      success: true,
      totalItems: catalog.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('Error importing all IKEA items:', error);
    res.status(500).json({ error: error.message || 'Failed to import IKEA items' });
  }
});

export default router;
