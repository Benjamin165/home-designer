import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Home Designer API is running' });
});

// API routes will be added here during implementation
// Example:
// app.use('/api/projects', projectsRouter);
// app.use('/api/floors', floorsRouter);
// app.use('/api/rooms', roomsRouter);
// app.use('/api/assets', assetsRouter);
// app.use('/api/furniture', furnitureRouter);
// app.use('/api/ai', aiRouter);
// app.use('/api/export', exportRouter);
// app.use('/api/settings', settingsRouter);

// Placeholder routes for initial testing
app.get('/api/projects', (req, res) => {
  res.json({ message: 'Projects endpoint - implementation in progress', projects: [] });
});

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
