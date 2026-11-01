import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface FfmpegPaths {
  ffmpegPath: string;
  ffprobePath: string;
  version: string;
  hasLibAss: boolean;
}

let cachedPaths: FfmpegPaths | null = null;

const CANDIDATE_FFMPEG_PATHS = [
  process.env.FFMPEG_PATH,
  'C:\\Program Files\\Kdenlive\\bin\\ffmpeg.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
  'C:\\ffmpeg\\bin\\ffmpeg.exe',
  'ffmpeg',
].filter(Boolean) as string[];

const CANDIDATE_FFPROBE_PATHS = [
  process.env.FFPROBE_PATH,
  'C:\\Program Files\\Kdenlive\\bin\\ffprobe.exe',
  'C:\\Program Files\\ffmpeg\\bin\\ffprobe.exe',
  'C:\\ffmpeg\\bin\\ffprobe.exe',
  'ffprobe',
].filter(Boolean) as string[];

function testExecutable(binPath: string, args: string[]): string | null {
  try {
    const isNamedCommand = binPath === 'ffmpeg' || binPath === 'ffprobe';
    if (!isNamedCommand && !fs.existsSync(binPath)) {
      return null;
    }
    const output = execSync(`"${binPath}" ${args.join(' ')}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
    });
    return output;
  } catch (err: any) {
    if (err.stdout) return err.stdout.toString();
    return null;
  }
}

export function detectFfmpeg(): FfmpegPaths {
  if (cachedPaths) return cachedPaths;

  let resolvedFfmpeg: string | null = null;
  let resolvedFfprobe: string | null = null;
  let versionOutput = '';

  for (const candidate of CANDIDATE_FFMPEG_PATHS) {
    const out = testExecutable(candidate, ['-version']);
    if (out && out.includes('ffmpeg version')) {
      resolvedFfmpeg = candidate;
      versionOutput = out;
      break;
    }
  }

  for (const candidate of CANDIDATE_FFPROBE_PATHS) {
    const out = testExecutable(candidate, ['-version']);
    if (out && out.includes('ffprobe version')) {
      resolvedFfprobe = candidate;
      break;
    }
  }

  if (!resolvedFfmpeg || !resolvedFfprobe) {
    throw new Error(
      `FFmpeg / FFprobe not found on system. Please set FFMPEG_PATH and FFPROBE_PATH in .env or install FFmpeg.`
    );
  }

  const hasLibAss = versionOutput.includes('--enable-libass');
  const versionLine = versionOutput.split('\n')[0] || 'Unknown';

  cachedPaths = {
    ffmpegPath: resolvedFfmpeg,
    ffprobePath: resolvedFfprobe,
    version: versionLine.trim(),
    hasLibAss,
  };

  return cachedPaths;
}
