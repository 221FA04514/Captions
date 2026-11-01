import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import apiRouter from './routes/api';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// --- CORS configuration ---
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Range', 'Accept'],
    exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length'],
    credentials: true,
  })
);

// --- Body parsers ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// --- API routes ---
app.use('/api', apiRouter);

// --- Serve built frontend in production ---
const clientDist = path.resolve(config.rootDir, 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// --- 404 handler for API routes ---
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// --- Centralized error handler ---
app.use(errorHandler);

export default app;
