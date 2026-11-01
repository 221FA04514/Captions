import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { config } from '../config';
import { createProject, getProject, updateProject, listProjects, deleteProject } from '../controllers/projectController';
import { uploadVideo, uploadSubtitles } from '../controllers/uploadController';
import { startExport, getExportStatus, downloadExport, cancelExport } from '../controllers/exportController';
import { streamMedia } from '../controllers/mediaController';
import { detectFfmpeg } from '../utils/ffmpegDetector';

const router = Router();

// --- Multer setup: disk storage to temp folder ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storage.temp);
  },
  filename: (_req, file, cb) => {
    const safeName = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const videoFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/avi'];
  const allowedExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowed.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported video format: ${file.mimetype} (${ext}). Use MP4, MOV, WebM, or AVI.`));
  }
};

const subtitleFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = ['.srt', '.vtt'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported subtitle format: ${ext}. Use SRT or WebVTT (.vtt).`));
  }
};

const videoUpload = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: config.maxUploadSizeBytes },
});

const subtitleUpload = multer({
  storage,
  fileFilter: subtitleFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for subtitle files
});

// --- Health check ---
router.get('/health', (_req, res) => {
  try {
    const ffmpegInfo = detectFfmpeg();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ffmpeg: {
        version: ffmpegInfo.version,
        hasLibAss: ffmpegInfo.hasLibAss,
        ffmpegPath: ffmpegInfo.ffmpegPath,
        ffprobePath: ffmpegInfo.ffprobePath,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'degraded',
      error: err.message,
    });
  }
});

// --- Project routes ---
router.get('/projects', listProjects);
router.post('/projects', createProject);
router.get('/projects/:id', getProject);
router.put('/projects/:id', updateProject);
router.delete('/projects/:id', deleteProject);

// --- Upload routes ---
router.post('/upload/video', videoUpload.single('video'), uploadVideo);
router.post('/upload/subtitles', subtitleUpload.single('subtitles'), uploadSubtitles);

// --- Media streaming route ---
router.get('/media/:fileId', streamMedia);

// --- Export routes ---
router.post('/export', startExport);
router.get('/export/:jobId', getExportStatus);
router.get('/export/:jobId/download', downloadExport);
router.post('/export/:jobId/cancel', cancelExport);

export default router;
