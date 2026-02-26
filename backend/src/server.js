import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import projectsRouter from './routes/projects.js';

dotenv.config();

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

// API routes
app.use('/api/projects', projectsRouter);

// Placeholder routes for other endpoints (will be implemented later)
// app.use('/api/floors', floorsRouter);
// app.use('/api/rooms', roomsRouter);
// app.use('/api/assets', assetsRouter);
// app.use('/api/furniture', furnitureRouter);
// app.use('/api/ai', aiRouter);
// app.use('/api/export', exportRouter);
// app.use('/api/settings', settingsRouter);

app.get('/api/assets', (req, res) => {
  res.json({ message: 'Assets endpoint - implementation in progress', assets: [] });
});

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
