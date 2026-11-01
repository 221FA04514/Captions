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
const candidatePaths = [
  path.resolve(config.rootDir, 'client/dist'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
  path.resolve(__dirname, '../../../client/dist'),
  path.resolve(__dirname, '../../client/dist'),
];

let clientDist: string | null = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
    clientDist = p;
    break;
  }
}

if (clientDist) {
  console.log(`[Frontend] Serving static frontend from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist!, 'index.html'));
  });
} else {
  console.warn(`[Frontend] Warning: client/dist not found in candidates:`, candidatePaths);
}

// --- 404 handler for API routes ---
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// --- Centralized error handler ---
app.use(errorHandler);

export default app;
