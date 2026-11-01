import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExportJob, ProjectData } from '../../../shared/types';
import { config } from '../config';
import { detectFfmpeg } from '../utils/ffmpegDetector';
import { generateAssScript } from './subtitleService';
import { projectStore } from './projectStore';

interface ActiveJobProcess {
  process: ChildProcess;
  tempAssPath: string;
  outputPath: string;
}

export class ExportService {
  private jobs: Map<string, ExportJob> = new Map();
  private activeProcesses: Map<string, ActiveJobProcess> = new Map();

  public getJob(jobId: string): ExportJob | undefined {
    return this.jobs.get(jobId);
  }

  public cancelJob(jobId: string): boolean {
    const active = this.activeProcesses.get(jobId);
    const job = this.jobs.get(jobId);

    if (active) {
      try {
        active.process.kill('SIGKILL');
      } catch {
        // Process might already be dead
      }

      // Cleanup files
      if (fs.existsSync(active.tempAssPath)) {
        try { fs.unlinkSync(active.tempAssPath); } catch {}
      }
      if (fs.existsSync(active.outputPath)) {
        try { fs.unlinkSync(active.outputPath); } catch {}
      }

      this.activeProcesses.delete(jobId);
    }

    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      job.stage = 'Cancelled by user';
      job.completedAt = new Date().toISOString();
      return true;
    }

    return false;
  }

  public async startExport(project: ProjectData): Promise<ExportJob> {
    if (!project.video) {
      throw new Error('Cannot export project without an uploaded video.');
    }

    if (!project.captions || project.captions.length === 0) {
      throw new Error('Cannot export project without any captions.');
    }

    const { ffmpegPath } = detectFfmpeg();
    const jobId = uuidv4();
    const videoDuration = project.video.duration || 10;

    // Check all possible storage locations for the uploaded video file
    const candidatePaths = [
      path.resolve(config.storage.uploads, project.video.filename),
      path.resolve(config.storage.temp, project.video.filename),
      path.resolve(config.storage.base, 'uploads', project.video.filename),
      path.resolve(process.cwd(), 'storage/uploads', project.video.filename),
      path.resolve(config.rootDir, 'storage/uploads', project.video.filename),
    ];

    let inputVideoPath = candidatePaths.find((p) => fs.existsSync(p));
    if (!inputVideoPath && fs.existsSync(config.storage.uploads)) {
      try {
        const files = fs.readdirSync(config.storage.uploads);
        const match = files.find((f) => f.toLowerCase() === project.video?.filename.toLowerCase());
        if (match) inputVideoPath = path.join(config.storage.uploads, match);
      } catch {}
    }

    if (!inputVideoPath || !fs.existsSync(inputVideoPath)) {
      throw new Error(`Source video not found on disk: ${project.video.filename}`);
    }

    // 1. Prepare temp directory and ASS subtitle script
    const tempAssFilename = `${jobId}.ass`;
    const tempAssPath = path.resolve(config.storage.temp, tempAssFilename);
    const assContent = generateAssScript(
      project.captions,
      project.style,
      project.video.width || 1920,
      project.video.height || 1080
    );
    fs.writeFileSync(tempAssPath, assContent, 'utf-8');

    // 2. Prepare output path
    const outputFilename = `bujjigadu_${jobId.slice(0, 8)}.mp4`;
    const outputPath = path.resolve(config.storage.exports, outputFilename);

    // 3. Initialize job record
    const job: ExportJob = {
      jobId,
      projectId: project.id,
      status: 'processing',
      progress: 0,
      stage: 'Initializing video encoder...',
      outputFilename,
      outputPath,
      duration: videoDuration,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);

    // 4. Assemble FFmpeg arguments
    // To completely avoid Windows drive-letter escaping complexities in libavfilter,
    // we use a relative path with cwd set to config.storage.temp!
    const relativeAssName = tempAssFilename;
    // Escaped relative path for filter syntax
    const assFilter = `ass=${relativeAssName}`;

    // Memory- and CPU-optimized arguments for low-resource cloud environments (Render Free Tier 512MB RAM)
    const encoderPreset = process.env.NODE_ENV === 'production' ? 'ultrafast' : (project.exportSettings.preset || 'fast');

    const ffmpegArgs = [
      '-y',
      '-i',
      inputVideoPath,
      '-vf',
      assFilter,
      '-c:v',
      'libx264',
      '-preset',
      encoderPreset,
      '-crf',
      String(project.exportSettings.crf ?? 22),
      '-threads',
      '2',
      '-max_muxing_queue_size',
      '1024',
      '-bufsize',
      '2048k',
    ];

    if (project.video.hasAudio) {
      // Re-encode audio to AAC or copy for maximum compatibility
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
    } else {
      ffmpegArgs.push('-an');
    }

    // Progress reporting flag
    ffmpegArgs.push('-progress', 'pipe:1', outputPath);

    // 5. Spawn FFmpeg child process
    const proc = spawn(ffmpegPath, ffmpegArgs, {
      cwd: config.storage.temp,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.activeProcesses.set(jobId, {
      process: proc,
      tempAssPath,
      outputPath,
    });

    let stderrOutput = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      // Parse progress data e.g. "out_time_ms=1500000" or "out_time_us=1500000000"
      const matchUs = text.match(/out_time_us=(\d+)/);
      const matchMs = text.match(/out_time_ms=(\d+)/);

      let processedSeconds = 0;
      if (matchUs) {
        processedSeconds = parseInt(matchUs[1], 10) / 1000000;
      } else if (matchMs) {
        processedSeconds = parseInt(matchMs[1], 10) / 1000;
      }

      if (processedSeconds > 0 && videoDuration > 0) {
        const pct = Math.min(99, Math.round((processedSeconds / videoDuration) * 100));
        job.progress = pct;
        job.stage = `Rendering burned-in subtitles (${pct}%)...`;
      }
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderrOutput += data.toString();
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(jobId);

      // Clean up temp ASS file
      if (fs.existsSync(tempAssPath)) {
        try { fs.unlinkSync(tempAssPath); } catch {}
      }

      if (code === 0 && fs.existsSync(outputPath)) {
        const stat = fs.statSync(outputPath);
        job.status = 'completed';
        job.progress = 100;
        job.stage = 'Render completed successfully!';
        job.outputSize = stat.size;
        job.completedAt = new Date().toISOString();
      } else if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.stage = 'Render failed';
        job.error = `FFmpeg render failed with exit code ${code}. Error details: ${stderrOutput.slice(-500)}`;
        job.completedAt = new Date().toISOString();
      }
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(jobId);
      job.status = 'failed';
      job.stage = 'Failed to execute FFmpeg process';
      job.error = err.message;
      job.completedAt = new Date().toISOString();
    });

    return job;
  }
}

export const exportService = new ExportService();
