import express from 'express';
import { getDatabase, saveDatabase } from '../db/connection.js';

const router = express.Router();

// GET /api/assets - List all assets with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category, search, favorite } = req.query;
    const db = await getDatabase();

    let query = 'SELECT * FROM assets WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    if (favorite === 'true') {
      query += ' AND is_favorite = 1';
    }

    query += ' ORDER BY created_at DESC';

    const result = db.exec(query, params);

    let assets = [];
    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      assets = result[0].values.map(row => {
        const asset = {};
        columns.forEach((col, idx) => {
          asset[col] = row[idx];
        });
        return asset;
      });
    }

    res.json({ assets });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id - Get a specific asset
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const result = db.exec('SELECT * FROM assets WHERE id = ?', [parseInt(id)]);

    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const columns = result[0].columns;
    const row = result[0].values[0];
    const asset = {};
    columns.forEach((col, idx) => {
      asset[col] = row[idx];
    });

    res.json({ asset });
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets - Create a new asset
router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      source,
      model_path,
      thumbnail_path,
      width,
      height,
      depth,
      dimension_locked,
      source_url,
      source_product_name
    } = req.body;

    if (!name || !category || !source || !model_path) {
      return res.status(400).json({
        error: 'Required fields: name, category, source, model_path'
      });
    }

    const db = await getDatabase();

    db.run(
      `INSERT INTO assets (
        name, category, subcategory, source, model_path, thumbnail_path,
        width, height, depth, dimension_locked, source_url, source_product_name,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        name,
        category,
        subcategory || null,
        source,
        model_path,
        thumbnail_path || null,
        width || null,
        height || null,
        depth || null,
        dimension_locked ? 1 : 0,
        source_url || null,
        source_product_name || null
      ]
    );

    const result = db.exec('SELECT * FROM assets ORDER BY id DESC LIMIT 1');

    if (result.length > 0 && result[0].values.length > 0) {
      const columns = result[0].columns;
      const row = result[0].values[0];
      const asset = {};
      columns.forEach((col, idx) => {
        asset[col] = row[idx];
      });

      saveDatabase();
      res.status(201).json({ asset });
    } else {
      throw new Error('Failed to retrieve created asset');
    }
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id - Update an asset
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      subcategory,
      width,
      height,
      depth,
      dimension_locked,
      thumbnail_path
    } = req.body;

    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM assets WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.run(
      `UPDATE assets
       SET name = COALESCE(?, name),
           category = COALESCE(?, category),
           subcategory = COALESCE(?, subcategory),
           width = COALESCE(?, width),
           height = COALESCE(?, height),
           depth = COALESCE(?, depth),
           dimension_locked = COALESCE(?, dimension_locked),
           thumbnail_path = COALESCE(?, thumbnail_path),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || null,
        category || null,
        subcategory || null,
        width || null,
        height || null,
        depth || null,
        dimension_locked !== undefined ? (dimension_locked ? 1 : 0) : null,
        thumbnail_path || null,
        parseInt(id)
      ]
    );

    saveDatabase();

    const result = db.exec('SELECT * FROM assets WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const asset = {};
    columns.forEach((col, idx) => {
      asset[col] = row[idx];
    });

    res.json({ asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id - Delete an asset
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id FROM assets WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    db.run('DELETE FROM assets WHERE id = ?', [parseInt(id)]);
    saveDatabase();

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// PUT /api/assets/:id/favorite - Toggle favorite status
router.put('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDatabase();

    const checkResult = db.exec('SELECT id, is_favorite FROM assets WHERE id = ?', [parseInt(id)]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const currentFavorite = checkResult[0].values[0][1];
    const newFavorite = currentFavorite ? 0 : 1;

    db.run('UPDATE assets SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
      newFavorite,
      parseInt(id)
    ]);

    saveDatabase();

    const result = db.exec('SELECT * FROM assets WHERE id = ?', [parseInt(id)]);
    const columns = result[0].columns;
    const row = result[0].values[0];
    const asset = {};
    columns.forEach((col, idx) => {
      asset[col] = row[idx];
    });

    res.json({ asset });
  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({ error: 'Failed to toggle favorite' });
  }
});

export default router;
