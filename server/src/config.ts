import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ensureDirectoryExists } from './utils/pathSecurity';

function findProjectRoot(): string {
  // 1. Check if process.cwd() is project root
  if (
    fs.existsSync(path.join(process.cwd(), 'client')) &&
    fs.existsSync(path.join(process.cwd(), 'server'))
  ) {
    return process.cwd();
  }
  // 2. Ascend from __dirname to locate root folder containing both client and server
  let curr = __dirname;
  for (let i = 0; i < 6; i++) {
    if (
      fs.existsSync(path.join(curr, 'client')) &&
      fs.existsSync(path.join(curr, 'server'))
    ) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return process.cwd();
}

const ROOT_DIR = findProjectRoot();
dotenv.config({ path: path.resolve(ROOT_DIR, '.env') });
const STORAGE_BASE = path.resolve(ROOT_DIR, process.env.STORAGE_DIR || './storage');

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),
  rootDir: ROOT_DIR,
  storage: {
    base: STORAGE_BASE,
    uploads: path.join(STORAGE_BASE, 'uploads'),
    exports: path.join(STORAGE_BASE, 'exports'),
    projects: path.join(STORAGE_BASE, 'projects'),
    temp: path.join(STORAGE_BASE, 'temp'),
  },
  maxUploadSizeBytes: (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '500', 10)) * 1024 * 1024,
  maxConcurrentRenders: parseInt(process.env.MAX_CONCURRENT_RENDERS || '2', 10),
};

// Ensure all storage directories exist
ensureDirectoryExists(config.storage.base);
ensureDirectoryExists(config.storage.uploads);
ensureDirectoryExists(config.storage.exports);
ensureDirectoryExists(config.storage.projects);
ensureDirectoryExists(config.storage.temp);
