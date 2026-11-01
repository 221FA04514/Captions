import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ProjectData } from '../../../shared/types';
import { DEFAULT_STYLE } from '../../../shared/presets';
import { projectStore } from '../services/projectStore';

export function createProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const title = req.body.title || 'Untitled Project';
    const id = uuidv4();
    const now = new Date().toISOString();

    const newProject: ProjectData = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      video: null,
      captions: [],
      style: { ...DEFAULT_STYLE },
      exportSettings: {
        format: 'mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        preset: 'fast',
        crf: 22,
      },
    };

    const saved = projectStore.saveProject(newProject);
    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
}

export function getProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const project = projectStore.getProject(id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export function updateProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const data: ProjectData = { ...req.body, id };
    const saved = projectStore.saveProject(data);
    res.json(saved);
  } catch (err) {
    next(err);
  }
}

export function listProjects(req: Request, res: Response, next: NextFunction): void {
  try {
    const list = projectStore.listProjects();
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export function deleteProject(req: Request, res: Response, next: NextFunction): void {
  try {
    const { id } = req.params;
    const success = projectStore.deleteProject(id);
    res.json({ success });
  } catch (err) {
    next(err);
  }
}
