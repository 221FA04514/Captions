import path from 'path';
import fs from 'fs';

/**
 * Validates that a requested file path resolves strictly within the allowed directory.
 * Prevents Directory Traversal attacks (e.g. "../../../etc/passwd").
 */
export function resolveSafePath(baseDir: string, relativePath: string): string {
  const resolvedBase = path.resolve(baseDir);
  const targetPath = path.resolve(resolvedBase, relativePath);

  if (!targetPath.startsWith(resolvedBase + path.sep) && targetPath !== resolvedBase) {
    throw new Error('Access denied: Path traversal detected');
  }

  return targetPath;
}

/**
 * Strips dangerous characters and ensures only alphanumeric, dashes, dots, and underscores remain.
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Ensures a directory exists synchronously.
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
