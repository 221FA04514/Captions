import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { exportService } from '../services/exportService';
import { projectStore } from '../services/projectStore';
import { resolveSafePath } from '../utils/pathSecurity';

export async function startExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    const project = projectStore.getProject(projectId);
    if (!project) {
      res.status(404).json({ error: `Project not found: ${projectId}` });
      return;
    }

    const job = await exportService.startExport(project);
    res.status(202).json(job);
  } catch (err) {
    next(err);
  }
}

export function getExportStatus(req: Request, res: Response, next: NextFunction): void {
  try {
    const { jobId } = req.params;
    const job = exportService.getJob(jobId);
    if (!job) {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
}

export function downloadExport(req: Request, res: Response, next: NextFunction): void {
  try {
    const { jobId } = req.params;
    const job = exportService.getJob(jobId);

    if (!job) {
      res.status(404).json({ error: 'Export job not found' });
      return;
    }

    if (job.status !== 'completed') {
      res.status(409).json({ error: `Export is not completed. Current status: ${job.status}` });
      return;
    }

    if (!job.outputPath || !fs.existsSync(job.outputPath)) {
      res.status(404).json({ error: 'Exported file not found on disk' });
      return;
    }

    const stat = fs.statSync(job.outputPath);
    const filename = job.outputFilename || 'export.mp4';

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stat.size);

    fs.createReadStream(job.outputPath).pipe(res);
  } catch (err) {
    next(err);
  }
}

export function cancelExport(req: Request, res: Response, next: NextFunction): void {
  try {
    const { jobId } = req.params;
    const cancelled = exportService.cancelJob(jobId);
    res.json({ success: cancelled, message: cancelled ? 'Job cancelled' : 'Job was not active' });
  } catch (err) {
    next(err);
  }
}
