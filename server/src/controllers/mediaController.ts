import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { config } from '../config';
import { streamVideoWithRange } from '../services/videoService';
import { resolveSafePath } from '../utils/pathSecurity';

export function streamMedia(req: Request, res: Response, next: NextFunction): void {
  try {
    const { fileId } = req.params;

    // Validate fileId: only alphanumeric + dash + underscore + dot allowed (UUID + extension)
    if (!/^[\w.-]+$/.test(fileId)) {
      res.status(400).json({ error: 'Invalid file identifier' });
      return;
    }

    const filePath = resolveSafePath(config.storage.uploads, fileId);
    streamVideoWithRange(filePath, req.headers.range, res);
  } catch (err: any) {
    if (err.message?.includes('Path traversal')) {
      res.status(403).json({ error: 'Access denied' });
    } else {
      next(err);
    }
  }
}
