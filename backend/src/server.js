import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import projectsRouter from './routes/projects.js';
import assetsRouter from './routes/assets.js';
import floorsRouter from './routes/floors.js';
import roomsRouter from './routes/rooms.js';
import wallsRouter from './routes/walls.js';
import furnitureRouter from './routes/furniture.js';
import { resetDatabase } from './db/connection.js';

dotenv.config();

// Reset database connection on startup to ensure fresh connection with correct settings
resetDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use('/assets', express.static(join(__dirname, '../../assets')));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { getDatabase } = await import('./db/connection.js');
    const db = await getDatabase();

    // Test database query
    const result = db.exec('SELECT 1 as test');
    const dbHealthy = result.length > 0 && result[0].values[0][0] === 1;

    res.json({
      status: 'ok',
      message: 'Home Designer API is running',
      database: {
        connected: true,
        healthy: dbHealthy,
        type: 'SQLite (sql.js)'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
});

// Database schema check endpoint
app.get('/api/health/schema', async (req, res) => {
  try {
    // Force fresh import to avoid module caching issues
    const { getDatabase } = await import(`./db/connection.js?t=${Date.now()}`);
    const db = await getDatabase();

    // CRITICAL: Ensure foreign keys are enabled before checking
    // In sql.js, this is a per-connection setting and may need to be re-enabled
    db.exec('PRAGMA foreign_keys = ON');

    // Get all tables
    const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    const tables = tablesResult.length > 0 ? tablesResult[0].values.map(row => row[0]) : [];

    // Required tables
    const requiredTables = [
      'projects', 'floors', 'rooms', 'walls', 'assets', 'asset_tags',
      'furniture_placements', 'lights', 'windows', 'doors', 'edit_history',
      'ai_generations', 'user_settings', 'material_presets'
    ];

    // Check which tables exist
    const missingTables = requiredTables.filter(table => !tables.includes(table));
    const allTablesExist = missingTables.length === 0;

    // Get table details for each required table
    const tableDetails = {};
    requiredTables.forEach(tableName => {
      if (tables.includes(tableName)) {
        const schemaResult = db.exec(`PRAGMA table_info(${tableName})`);
        if (schemaResult.length > 0) {
          const columns = schemaResult[0].columns;
          const rows = schemaResult[0].values;
          tableDetails[tableName] = rows.map(row => {
            const col = {};
            columns.forEach((colName, idx) => {
              col[colName] = row[idx];
            });
            return col;
          });
        }
      }
    });

    // Check foreign keys
    const fkResult = db.exec('PRAGMA foreign_keys');
    const foreignKeysEnabled = fkResult.length > 0 && fkResult[0].values[0][0] === 1;

    res.json({
      status: allTablesExist ? 'ok' : 'incomplete',
      tables: {
        found: tables,
        required: requiredTables,
        missing: missingTables,
        count: tables.length
      },
      foreignKeysEnabled,
      tableDetails,
      allTablesExist
    });
  } catch (error) {
    console.error('Error checking schema:', error);
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api', floorsRouter); // Handles /api/projects/:projectId/floors and /api/floors/:id
app.use('/api', roomsRouter); // Handles /api/floors/:floorId/rooms and /api/rooms/:id
app.use('/api', wallsRouter); // Handles /api/rooms/:roomId/walls and /api/walls/:id
app.use('/api', furnitureRouter); // Handles /api/rooms/:roomId/furniture and /api/furniture/:id

// Placeholder routes for other endpoints (will be implemented later)
// app.use('/api/ai', aiRouter);
// app.use('/api/export', exportRouter);
// app.use('/api/settings', settingsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      status: 404,
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log('========================================');
  console.log('  Home Designer Backend API');
  console.log('========================================');
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health`);
  console.log('========================================');
});

export default app;
