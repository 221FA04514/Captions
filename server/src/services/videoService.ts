import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { VideoMetadata } from '../../../shared/types';
import { detectFfmpeg } from '../utils/ffmpegDetector';

/**
 * Executes ffprobe in a child process with JSON output to extract video metadata.
 */
export async function extractVideoMetadata(
  filePath: string,
  originalFilename: string,
  videoId: string
): Promise<VideoMetadata> {
  const { ffprobePath } = detectFfmpeg();

  const args = [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    filePath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`FFprobe failed (code ${code}): ${stderr}`));
      }

      try {
        const data = JSON.parse(stdout);
        const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
        const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

        if (!videoStream) {
          return reject(new Error('Uploaded file does not contain a valid video stream.'));
        }

        // Frame rate evaluation
        let fps = 30;
        if (videoStream.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && num) {
            fps = Math.round((num / den) * 100) / 100;
          }
        }

        const duration = parseFloat(data.format?.duration || videoStream.duration || '0');
        const width = parseInt(videoStream.width || '1920', 10);
        const height = parseInt(videoStream.height || '1080', 10);
        const stats = fs.statSync(filePath);

        const metadata: VideoMetadata = {
          id: videoId,
          filename: path.basename(filePath),
          originalName: originalFilename,
          duration: Math.round(duration * 100) / 100,
          width,
          height,
          fps,
          size: stats.size,
          mimeType: 'video/mp4',
          bitRate: data.format?.bit_rate ? parseInt(data.format.bit_rate, 10) : undefined,
          hasAudio: Boolean(audioStream),
        };

        resolve(metadata);
      } catch (err: any) {
        reject(new Error(`Failed to parse video metadata: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start FFprobe: ${err.message}`));
    });
  });
}

/**
 * Streams a video file to an Express response with HTTP 206 Partial Content support,
 * allowing browsers to seek without buffering the whole file.
 */
export function streamVideoWithRange(filePath: string, rangeHeader: string | undefined, res: Response): void {
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Video file not found' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}
