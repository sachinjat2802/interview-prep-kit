/**
 * @file auth.controller.ts
 * @description Controller Layer for User Authentication Domain — Handles HTTP request parsing, response cookies, and status codes.
 * @module Controllers/AuthController
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { AuthService } from '../services/auth.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../config.js';

export class AuthController {
  /**
   * POST /api/auth/register — Registers a new user and sets authentication cookie.
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        throw new AppError('Email, password, and name are required', 400, 'VALIDATION_ERROR');
      }
      if (typeof password !== 'string' || password.length < 6) {
        throw new AppError('Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
      }

      const result = await AuthService.register(email, password, name);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: config.isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login — Authenticates user credentials and sets authentication cookie.
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
      }

      const result = await AuthService.login(email, password);

      res.cookie('token', result.token, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: config.isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout — Clears session cookie and invalidates client session.
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'none' : 'lax',
    });
    res.json({ message: 'Logged out successfully' });
  }

  /**
   * GET /api/auth/me — Retrieves profile details for the currently authenticated user.
   */
  static async getMe(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getUserProfile(req.userId!);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  }
}
