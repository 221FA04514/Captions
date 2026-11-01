import fs from 'fs';
import path from 'path';
import { ProjectData } from '../../../shared/types';
import { ProjectDataSchema } from '../../../shared/validators';
import { config } from '../config';
import { ensureDirectoryExists, resolveSafePath } from '../utils/pathSecurity';

export class ProjectStore {
  private projectsDir: string;

  constructor() {
    this.projectsDir = config.storage.projects;
    ensureDirectoryExists(this.projectsDir);
  }

  private getProjectDir(id: string): string {
    const dir = resolveSafePath(this.projectsDir, id);
    ensureDirectoryExists(dir);
    return dir;
  }

  private getProjectFilePath(id: string): string {
    return path.join(this.getProjectDir(id), 'project.json');
  }

  public saveProject(project: ProjectData): ProjectData {
    const validated = ProjectDataSchema.parse(project);
    validated.updatedAt = new Date().toISOString();

    const filePath = this.getProjectFilePath(validated.id);
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2), 'utf-8');
    return validated;
  }

  public getProject(id: string): ProjectData | null {
    try {
      const filePath = this.getProjectFilePath(id);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return ProjectDataSchema.parse(parsed);
    } catch {
      return null;
    }
  }

  public listProjects(): Array<{ id: string; title: string; updatedAt: string; videoName: string | null; cueCount: number }> {
    if (!fs.existsSync(this.projectsDir)) {
      return [];
    }

    const entries = fs.readdirSync(this.projectsDir, { withFileTypes: true });
    const summaries: Array<{ id: string; title: string; updatedAt: string; videoName: string | null; cueCount: number }> = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const filePath = path.join(this.projectsDir, entry.name, 'project.json');
        if (fs.existsSync(filePath)) {
          try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data: ProjectData = JSON.parse(raw);
            summaries.push({
              id: data.id,
              title: data.title || 'Untitled Project',
              updatedAt: data.updatedAt,
              videoName: data.video ? data.video.originalName : null,
              cueCount: data.captions ? data.captions.length : 0,
            });
          } catch {
            // Ignore corrupted project directory
          }
        }
      }
    }

    return summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public deleteProject(id: string): boolean {
    const dir = this.getProjectDir(id);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}

export const projectStore = new ProjectStore();
