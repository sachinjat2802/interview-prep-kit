/**
 * @file practice.controller.ts
 * @description Controller Layer for Practice Domain — Handles HTTP request parsing, confidence validation, and response formatting.
 * @module Controllers/PracticeController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { PracticeService } from '../services/practice.service.js';
import { getParam } from '../utils/paramUtils.js';
import { AppError } from '../middleware/errorHandler.js';
import { ErrorCode } from '../constants/errorCodes.js';

export class PracticeController {
  /**
   * POST /api/practice/:kitId/session — Starts a practice session with confidence-sorted cards.
   */
  static async startSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.kitId);
      const result = await PracticeService.startSession(kitId, req.userId!);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/practice/:kitId/session/:sessionId/card/:cardId — Records confidence (1–5) for a card.
   */
  static async recordConfidence(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.kitId);
      const sessionId = getParam(req.params.sessionId);
      const cardId = getParam(req.params.cardId);

      const { confidence } = req.body;
      const confidenceNumber = parseInt(confidence, 10);
      if (isNaN(confidenceNumber) || confidenceNumber < 1 || confidenceNumber > 5) {
        throw new AppError('Confidence rating must be an integer between 1 and 5', 400, ErrorCode.INVALID_INPUT);
      }

      const session = await PracticeService.recordConfidence(kitId, sessionId, cardId, req.userId!, confidenceNumber);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/practice/:kitId/session/:sessionId/complete — Marks practice session as complete.
   */
  static async completeSession(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.kitId);
      const sessionId = getParam(req.params.sessionId);
      const session = await PracticeService.completeSession(kitId, sessionId, req.userId!);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/practice/:kitId/stats — Retrieves practice statistics for a kit.
   */
  static async getPracticeStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.kitId);
      const stats = await PracticeService.getPracticeStats(kitId, req.userId!);
      res.json({ stats });
    } catch (error) {
      next(error);
    }
  }
}
