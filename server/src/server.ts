import app from './app';
import { config } from './config';
import { detectFfmpeg } from './utils/ffmpegDetector';
import { startStorageCleanupJob } from './services/cleanupService';

async function bootstrap() {
  // Start periodic cleanup of files older than 1 hour (keeps Render disk clean)
  startStorageCleanupJob();

  // Verify FFmpeg availability on startup
  try {
    const ffmpegInfo = detectFfmpeg();
    console.log(`[Startup] FFmpeg detected: ${ffmpegInfo.version}`);
    console.log(`[Startup] FFprobe: ${ffmpegInfo.ffprobePath}`);
    console.log(`[Startup] libass support: ${ffmpegInfo.hasLibAss}`);

    if (!ffmpegInfo.hasLibAss) {
      console.warn('[WARNING] FFmpeg was found but libass is NOT enabled. Subtitle burn-in may fail.');
      console.warn('[WARNING] Please install a full FFmpeg build that includes --enable-libass.');
    }
  } catch (err: any) {
    console.error('[FATAL] FFmpeg not found:', err.message);
    console.error('[FATAL] Please set FFMPEG_PATH and FFPROBE_PATH in .env and restart.');
    process.exit(1);
  }

  const server = app.listen(config.port, config.host, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   BUJJIGADU SUBTITLE STUDIO - Backend API Server         ║');
    console.log(`║   Running on http://${config.host}:${config.port}                     ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('[Server] Health check: http://localhost:5000/api/health');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Server] Shutting down gracefully...');
    server.close(() => {
      console.log('[Server] Closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap();
