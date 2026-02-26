import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '../../database.db');

console.log('========================================');
console.log('  Database Initialization');
console.log('========================================');
console.log(`  Database path: ${DB_PATH}`);
console.log('');

// Create database connection
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('✓ Database connection established');

// Create tables
const schema = `
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_path TEXT,
  unit_system TEXT DEFAULT 'metric' CHECK(unit_system IN ('metric', 'imperial')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Floors table
CREATE TABLE IF NOT EXISTS floors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  floor_id INTEGER NOT NULL,
  name TEXT,
  dimensions_json TEXT NOT NULL,
  floor_material TEXT,
  floor_color TEXT,
  floor_texture_path TEXT,
  ceiling_height REAL DEFAULT 2.8,
  ceiling_material TEXT,
  ceiling_color TEXT,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  position_z REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
);

-- Walls table
CREATE TABLE IF NOT EXISTS walls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  start_x REAL NOT NULL,
  start_y REAL NOT NULL,
  end_x REAL NOT NULL,
  end_y REAL NOT NULL,
  height REAL NOT NULL,
  material TEXT,
  color TEXT,
  texture_path TEXT,
  has_window BOOLEAN DEFAULT 0,
  has_door BOOLEAN DEFAULT 0,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  source TEXT NOT NULL CHECK(source IN ('builtin', 'generated', 'imported', 'url_import')),
  model_path TEXT NOT NULL,
  thumbnail_path TEXT,
  width REAL,
  height REAL,
  depth REAL,
  dimension_locked BOOLEAN DEFAULT 0,
  source_url TEXT,
  source_product_name TEXT,
  is_favorite BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Asset tags table
CREATE TABLE IF NOT EXISTS asset_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset_id INTEGER NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
);

-- Furniture placements table
CREATE TABLE IF NOT EXISTS furniture_placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  asset_id INTEGER NOT NULL,
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  position_z REAL NOT NULL,
  rotation_x REAL DEFAULT 0,
  rotation_y REAL DEFAULT 0,
  rotation_z REAL DEFAULT 0,
  scale_x REAL DEFAULT 1.0,
  scale_y REAL DEFAULT 1.0,
  scale_z REAL DEFAULT 1.0,
  locked BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Lights table
CREATE TABLE IF NOT EXISTS lights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('floor_lamp', 'ceiling', 'wall_sconce', 'table_lamp', 'pendant')),
  position_x REAL NOT NULL,
  position_y REAL NOT NULL,
  position_z REAL NOT NULL,
  intensity REAL DEFAULT 1.0,
  color TEXT DEFAULT '#ffffff',
  cone_angle REAL,
  asset_id INTEGER,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Windows table
CREATE TABLE IF NOT EXISTS windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wall_id INTEGER NOT NULL,
  position_along_wall REAL NOT NULL,
  height_from_floor REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  style TEXT,
  FOREIGN KEY (wall_id) REFERENCES walls(id) ON DELETE CASCADE
);

-- Doors table
CREATE TABLE IF NOT EXISTS doors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wall_id INTEGER NOT NULL,
  position_along_wall REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  style TEXT,
  FOREIGN KEY (wall_id) REFERENCES walls(id) ON DELETE CASCADE
);

-- Edit history table
CREATE TABLE IF NOT EXISTS edit_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_data TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  snapshot_data TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- AI generations table
CREATE TABLE IF NOT EXISTS ai_generations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER,
  type TEXT NOT NULL CHECK(type IN ('photo_to_room', 'photo_to_furniture', 'url_import')),
  input_image_path TEXT,
  input_url TEXT,
  output_model_path TEXT,
  output_dimensions TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  encrypted BOOLEAN DEFAULT 0
);

-- Material presets table
CREATE TABLE IF NOT EXISTS material_presets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('wall', 'floor', 'ceiling')),
  color TEXT,
  texture_path TEXT,
  properties_json TEXT,
  is_builtin BOOLEAN DEFAULT 1
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_floors_project_id ON floors(project_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_walls_room_id ON walls(room_id);
CREATE INDEX IF NOT EXISTS idx_furniture_placements_room_id ON furniture_placements(room_id);
CREATE INDEX IF NOT EXISTS idx_furniture_placements_asset_id ON furniture_placements(asset_id);
CREATE INDEX IF NOT EXISTS idx_lights_room_id ON lights(room_id);
CREATE INDEX IF NOT EXISTS idx_windows_wall_id ON windows(wall_id);
CREATE INDEX IF NOT EXISTS idx_doors_wall_id ON doors(wall_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_project_id ON edit_history(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_project_id ON ai_generations(project_id);
CREATE INDEX IF NOT EXISTS idx_asset_tags_asset_id ON asset_tags(asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_is_favorite ON assets(is_favorite);
`;

// Execute schema
db.exec(schema);
console.log('✓ Database schema created');

// Insert default settings
const insertDefaultSettings = db.prepare(`
  INSERT OR IGNORE INTO user_settings (key, value, encrypted)
  VALUES (?, ?, ?)
`);

insertDefaultSettings.run('unit_system', 'metric', 0);
insertDefaultSettings.run('render_quality', 'high', 0);
insertDefaultSettings.run('auto_save_interval', '60000', 0);
insertDefaultSettings.run('performance_mode', '0', 0);

console.log('✓ Default settings inserted');

// Insert default material presets
const insertMaterialPreset = db.prepare(`
  INSERT OR IGNORE INTO material_presets (id, name, type, color, is_builtin)
  VALUES (?, ?, ?, ?, ?)
`);

const materialPresets = [
  [1, 'White Paint', 'wall', '#FFFFFF', 1],
  [2, 'Light Gray', 'wall', '#E5E7EB', 1],
  [3, 'Warm Beige', 'wall', '#F5F5DC', 1],
  [4, 'Light Hardwood', 'floor', '#DEB887', 1],
  [5, 'Dark Hardwood', 'floor', '#8B4513', 1],
  [6, 'White Tile', 'floor', '#F8F8F8', 1],
  [7, 'Gray Carpet', 'floor', '#9CA3AF', 1],
  [8, 'White Ceiling', 'ceiling', '#FFFFFF', 1],
  [9, 'Off-White Ceiling', 'ceiling', '#FAFAFA', 1],
];

materialPresets.forEach(preset => {
  insertMaterialPreset.run(...preset);
});

console.log('✓ Default material presets inserted');

// Close database
db.close();

console.log('');
console.log('========================================');
console.log('  ✅ Database initialized successfully!');
console.log('========================================');
console.log('');
