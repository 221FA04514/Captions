import fs from 'fs';
import path from 'path';
import { config } from '../config';

const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Periodically removes temporary upload, temp, and export files older than 1 hour.
 * Ensures Render container or VPS disk remains clean without requiring external cloud storage.
 */
export function startStorageCleanupJob(): void {
  const dirs = [config.storage.uploads, config.storage.exports, config.storage.temp];

  const cleanup = () => {
    const now = Date.now();

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === '.gitkeep') continue;

          const filePath = path.join(dir, file);
          try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > MAX_AGE_MS) {
              fs.unlinkSync(filePath);
            }
          } catch {
            // Ignore individual file errors (e.g. file in use)
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }
  };

  // Run cleanup every 15 minutes
  setInterval(cleanup, 15 * 60 * 1000);
  // Run once at startup
  setTimeout(cleanup, 5000);
}

