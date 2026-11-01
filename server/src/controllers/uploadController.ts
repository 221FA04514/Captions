import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { extractVideoMetadata } from '../services/videoService';
import { parseSubtitleFile, validateCues } from '../services/subtitleService';
import { sanitizeFilename } from '../utils/pathSecurity';

export async function uploadVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No video file provided' });
      return;
    }

    const videoId = uuidv4();
    const originalName = sanitizeFilename(req.file.originalname || 'video.mp4');
    const ext = path.extname(originalName) || '.mp4';
    const storedFilename = `${videoId}${ext}`;
    const targetPath = path.join(config.storage.uploads, storedFilename);

    // Rename/move temp file to uploads directory
    fs.renameSync(req.file.path, targetPath);

    // Extract real metadata with FFprobe
    const metadata = await extractVideoMetadata(targetPath, originalName, videoId);
    res.json(metadata);
  } catch (err) {
    // If failure, remove uploaded temp file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(err);
  }
}

export async function uploadSubtitles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let content = '';
    let filename = 'subtitles.srt';

    if (req.file) {
      filename = req.file.originalname;
      content = fs.readFileSync(req.file.path, 'utf-8');
      // Remove temporary upload file
      try { fs.unlinkSync(req.file.path); } catch {}
    } else if (req.body && typeof req.body.content === 'string') {
      content = req.body.content;
      filename = req.body.filename || 'subtitles.srt';
    } else {
      res.status(400).json({ error: 'No subtitle file or content provided' });
      return;
    }

    if (!content.trim()) {
      res.status(400).json({ error: 'Subtitle file is empty' });
      return;
    }

    const cues = parseSubtitleFile(content, filename);
    if (cues.length === 0) {
      res.status(400).json({
        error: 'Failed to parse subtitles. Please check that the file is a valid SRT or WebVTT format.',
      });
      return;
    }

    const videoDuration = req.body.videoDuration ? parseFloat(req.body.videoDuration) : undefined;
    const validation = validateCues(cues, videoDuration);

    res.json(validation);
  } catch (err) {
    next(err);
  }
}
