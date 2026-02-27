/**
 * IKEA Furniture Service
 * 
 * Provides access to IKEA 3D models from the official IKEA 3D Assembly Dataset.
 * Dataset source: https://github.com/IKEA/IKEA3DAssemblyDataset
 * License: CC BY-NC-SA 4.0 (Non-commercial use only)
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// IKEA 3D Assembly Dataset models (official, CC BY-NC-SA 4.0)
// These are real IKEA product IDs with GLB models available
const IKEA_CATALOG = [
  {
    id: 'BEKVAM_40463852',
    name: 'BEKVÄM Step stool',
    category: 'Storage',
    subcategory: 'Step Stools',
    width: 0.43,
    height: 0.50,
    depth: 0.39,
    price: 24.99,
    glbUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/BEKVAM_40463852/BEKVAM_40463852.glb',
  },
  {
    id: 'DALFRED_60155602',
    name: 'DALFRED Bar stool',
    category: 'Seating',
    subcategory: 'Bar Stools',
    width: 0.40,
    height: 0.63,
    depth: 0.40,
    price: 39.99,
    glbUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/DALFRED_60155602/DALFRED_60155602.glb',
  },
  {
    id: 'EKET_00333947_70x35x35',
    name: 'EKET Cabinet 70x35x35',
    category: 'Storage',
    subcategory: 'Cabinets',
    width: 0.70,
    height: 0.35,
    depth: 0.35,
    price: 35.00,
    glbUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/EKET_00333947_70x35x35/EKET_00333947_70x35x35.glb',
  },
  {
    id: 'EKET_70332124_35x25x35',
    name: 'EKET Cabinet 35x25x35',
    category: 'Storage',
    subcategory: 'Cabinets',
    width: 0.35,
    height: 0.25,
    depth: 0.35,
    price: 20.00,
    glbUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/EKET_70332124_35x25x35/EKET_70332124_35x25x35.glb',
  },
  {
    id: 'LACK_30449908_55x55',
    name: 'LACK Side table 55x55',
    category: 'Tables',
    subcategory: 'Side Tables',
    width: 0.55,
    height: 0.45,
    depth: 0.55,
    price: 9.99,
    glbUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/LACK_30449908_55x55/LACK_30449908_55x55.glb',
  },
];

// Local cache directory
const CACHE_DIR = join(__dirname, '../../cache/ikea');

// Ensure cache directory exists
if (!existsSync(CACHE_DIR)) {
  mkdirSync(CACHE_DIR, { recursive: true });
}

/**
 * Get all available IKEA furniture items
 */
export function getIKEACatalog() {
  return IKEA_CATALOG.map(item => ({
    ...item,
    source: 'ikea',
    thumbnailUrl: `https://www.ikea.com/us/en/images/products/${item.id.toLowerCase()}_${item.id.split('_')[1]}__s5.jpg`,
  }));
}

/**
 * Search IKEA catalog
 */
export function searchIKEACatalog(query) {
  const normalizedQuery = query.toLowerCase();
  return IKEA_CATALOG.filter(item =>
    item.name.toLowerCase().includes(normalizedQuery) ||
    item.category.toLowerCase().includes(normalizedQuery) ||
    item.subcategory.toLowerCase().includes(normalizedQuery)
  );
}

/**
 * Get a specific IKEA item
 */
export function getIKEAItem(id) {
  return IKEA_CATALOG.find(item => item.id === id);
}

/**
 * Download and cache a GLB model
 */
export async function downloadIKEAModel(id) {
  const item = getIKEAItem(id);
  if (!item) {
    throw new Error(`IKEA item not found: ${id}`);
  }

  const cachePath = join(CACHE_DIR, `${id}.glb`);
  
  // Check if already cached
  if (existsSync(cachePath)) {
    console.log(`[IKEA] Model ${id} already cached`);
    return {
      path: cachePath,
      cached: true,
    };
  }

  // Download the model
  console.log(`[IKEA] Downloading model ${id} from ${item.glbUrl}`);
  
  try {
    const response = await fetch(item.glbUrl);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    writeFileSync(cachePath, Buffer.from(buffer));
    
    console.log(`[IKEA] Model ${id} downloaded and cached`);
    return {
      path: cachePath,
      cached: false,
    };
  } catch (error) {
    console.error(`[IKEA] Error downloading model ${id}:`, error.message);
    throw error;
  }
}

/**
 * Get the local path for a cached model
 */
export function getModelPath(id) {
  const cachePath = join(CACHE_DIR, `${id}.glb`);
  if (existsSync(cachePath)) {
    return cachePath;
  }
  return null;
}

/**
 * Import an IKEA item into the assets database
 */
export async function importIKEAToAssets(db, id) {
  const item = getIKEAItem(id);
  if (!item) {
    throw new Error(`IKEA item not found: ${id}`);
  }

  // Download the model first
  const { path } = await downloadIKEAModel(id);
  
  // Check if already imported
  const existing = db.exec(
    'SELECT id FROM assets WHERE source_product_name = ? AND source = ?',
    [item.id, 'ikea']
  );
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    console.log(`[IKEA] Item ${id} already imported`);
    return existing[0].values[0][0];
  }

  // Insert into assets table
  db.run(
    `INSERT INTO assets (
      name, category, subcategory, source, model_path,
      width, height, depth, source_url, source_product_name,
      created_at, updated_at
    ) VALUES (?, ?, ?, 'ikea', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      item.name,
      item.category,
      item.subcategory,
      `/api/ikea/models/${item.id}`,
      item.width,
      item.height,
      item.depth,
      item.glbUrl,
      item.id,
    ]
  );

  // Get the inserted ID
  const result = db.exec('SELECT id FROM assets ORDER BY id DESC LIMIT 1');
  return result[0].values[0][0];
}

export default {
  getIKEACatalog,
  searchIKEACatalog,
  getIKEAItem,
  downloadIKEAModel,
  getModelPath,
  importIKEAToAssets,
};
