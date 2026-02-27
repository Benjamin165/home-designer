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
// Note: The dataset provides OBJ files, not GLB. We use the OBJ files and note this limitation.
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
    // OBJ format from the actual dataset
    objUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/BEKV%C3%84M_40463852/BEKV%C3%84M_40463852.obj',
    mtlUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/BEKV%C3%84M_40463852/BEKV%C3%84M_40463852.mtl',
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
    objUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/DALFRED_60155602/DALFRED_60155602.obj',
    mtlUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/DALFRED_60155602/DALFRED_60155602.mtl',
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
    objUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/EKET_00333947_70x35x35/EKET_00333947_70x35x35.obj',
    mtlUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/EKET_00333947_70x35x35/EKET_00333947_70x35x35.mtl',
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
    objUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/EKET_70332124_35x25x35/EKET_70332124_35x25x35.obj',
    mtlUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/EKET_70332124_35x25x35/EKET_70332124_35x25x35.mtl',
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
    objUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/LACK_30449908_55x55/LACK_30449908_55x55.obj',
    mtlUrl: 'https://raw.githubusercontent.com/IKEA/IKEA3DAssemblyDataset/main/Dataset/LACK_30449908_55x55/LACK_30449908_55x55.mtl',
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
 * Download and cache model files (OBJ + MTL)
 * Note: IKEA 3D Assembly Dataset provides OBJ format, not GLB
 */
export async function downloadIKEAModel(id) {
  const item = getIKEAItem(id);
  if (!item) {
    throw new Error(`IKEA item not found: ${id}`);
  }

  const objCachePath = join(CACHE_DIR, `${id}.obj`);
  const mtlCachePath = join(CACHE_DIR, `${id}.mtl`);
  
  // Check if already cached
  if (existsSync(objCachePath)) {
    console.log(`[IKEA] Model ${id} already cached`);
    return {
      objPath: objCachePath,
      mtlPath: existsSync(mtlCachePath) ? mtlCachePath : null,
      cached: true,
      format: 'obj',
    };
  }

  // Download the OBJ model
  console.log(`[IKEA] Downloading model ${id} from ${item.objUrl}`);
  
  try {
    // Download OBJ
    const objResponse = await fetch(item.objUrl);
    if (!objResponse.ok) {
      throw new Error(`Failed to download OBJ: ${objResponse.status} ${objResponse.statusText}`);
    }
    const objBuffer = await objResponse.arrayBuffer();
    writeFileSync(objCachePath, Buffer.from(objBuffer));

    // Download MTL if available
    if (item.mtlUrl) {
      try {
        const mtlResponse = await fetch(item.mtlUrl);
        if (mtlResponse.ok) {
          const mtlBuffer = await mtlResponse.arrayBuffer();
          writeFileSync(mtlCachePath, Buffer.from(mtlBuffer));
        }
      } catch (mtlError) {
        console.warn(`[IKEA] Could not download MTL for ${id}:`, mtlError.message);
      }
    }
    
    console.log(`[IKEA] Model ${id} downloaded and cached (OBJ format)`);
    return {
      objPath: objCachePath,
      mtlPath: existsSync(mtlCachePath) ? mtlCachePath : null,
      cached: false,
      format: 'obj',
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
  // Check for OBJ first (primary format from IKEA dataset)
  const objPath = join(CACHE_DIR, `${id}.obj`);
  if (existsSync(objPath)) {
    return { path: objPath, format: 'obj' };
  }
  // Fall back to GLB
  const glbPath = join(CACHE_DIR, `${id}.glb`);
  if (existsSync(glbPath)) {
    return { path: glbPath, format: 'glb' };
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
  const result = await downloadIKEAModel(id);
  const modelPath = result.objPath || result.path;
  
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
      item.objUrl || '',
      item.id,
    ]
  );

  // Get the inserted ID
  const insertResult = db.exec('SELECT id FROM assets ORDER BY id DESC LIMIT 1');
  return insertResult[0].values[0][0];
}

export default {
  getIKEACatalog,
  searchIKEACatalog,
  getIKEAItem,
  downloadIKEAModel,
  getModelPath,
  importIKEAToAssets,
};
