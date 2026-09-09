import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './errorHandler.js';
import { ErrorCode, ErrorMessage } from '../constants/errorCodes.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    // Check Authorization header first, then cookie
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.query?.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      throw new AppError(ErrorMessage[ErrorCode.AUTH_REQUIRED], 401, ErrorCode.AUTH_REQUIRED);
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError(ErrorMessage[ErrorCode.TOKEN_EXPIRED], 401, ErrorCode.TOKEN_EXPIRED));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(ErrorMessage[ErrorCode.TOKEN_INVALID], 401, ErrorCode.TOKEN_INVALID));
    } else {
      next(new AppError(ErrorMessage[ErrorCode.AUTH_FAILED], 401, ErrorCode.AUTH_FAILED));
    }
  }
}
