import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    Error.captureStackTrace(this, this.constructor);
  }
}

import { logger } from '../utils/logger.js';

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const code = 'code' in err ? err.code : 'INTERNAL_ERROR';

  logger.error('ErrorHandler', `${code}: ${err.message}`, err.stack);

  res.status(statusCode).json({
    error: {
      code,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
