import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import path from 'path';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import { bootstrapServices } from './core/bootstrap.js';
import authRoutes from './routes/auth.routes.js';
import kitRoutes from './routes/kit.routes.js';
import practiceRoutes from './routes/practice.routes.js';

import { logger } from './utils/logger.js';

const app = express();

// ─── Middleware ───
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ─── Health check ───
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbConnected: mongoose.connection.readyState === 1,
  });
});

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);
app.use('/api/practice', practiceRoutes);

// ─── Static Client Assets & SPA Fallback ───
const clientOutPath = path.resolve(__dirname, '../../client/out');
app.use(express.static(clientOutPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientOutPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// ─── Error handler (must be last) ───
app.use(errorHandler);

// ─── Start server ───
async function start() {
  try {
    // Attempt MongoDB connection with 1s fast timeout
    await mongoose.connect(config.mongodb.uri, { serverSelectionTimeoutMS: 1000 });
    logger.info('Server', '✓ Connected to MongoDB');
  } catch (_error) {
    logger.info('Server', 'ℹ Local MongoDB not detected. Activating In-Memory Database Mode (No MongoDB installation required).');
  }

  // Bootstrap DI container (composition root)
  bootstrapServices();

  app.listen(config.port, () => {
    logger.info('Server', `✓ Server running on port ${config.port}`);
    logger.info('Server', `  Environment: ${config.nodeEnv}`);
  });
}

start();

export { app };
