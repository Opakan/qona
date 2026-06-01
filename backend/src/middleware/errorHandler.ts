import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const traceId = req.traceId ?? 'unknown';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      stage: 'request',
      error: err.message,
      traceId,
    });
    return;
  }

  console.error('[Qona API] Unhandled error:', { traceId, message: err.message });
  res.status(500).json({
    success: false,
    stage: 'internal',
    error: 'An unexpected error occurred.',
    details: config.NODE_ENV === 'development' ? err.message : undefined,
    traceId,
  });
}
