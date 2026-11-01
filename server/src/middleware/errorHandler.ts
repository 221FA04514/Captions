import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Log error details for debugging
  console.error(`[ERROR] ${statusCode}: ${message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  // Multer-specific errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'File too large',
      message: `Upload size exceeds the allowed limit.`,
    });
    return;
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
