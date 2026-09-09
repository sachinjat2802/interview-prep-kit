/**
 * @file kit.controller.ts
 * @description Controller Layer for Kit Domain — Handles HTTP request parsing, status codes, and response formatting for prep kits.
 * @module Controllers/KitController
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { KitService } from '../services/kit.service.js';
import { getParam } from '../utils/paramUtils.js';
import { AppError } from '../middleware/errorHandler.js';
import { ErrorCode } from '../constants/errorCodes.js';

export class KitController {
  /**
   * GET /api/kits — List all prep kits belonging to the authenticated user.
   */
  static async listKits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kits = await KitService.getUserKits(req.userId!);
      res.json({ kits });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/kits/:id — Retrieve a single prep kit by ID.
   */
  static async getKit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const kit = await KitService.getKitById(kitId, req.userId!);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kits — Create and initiate pipeline for a single role.
   */
  static async createKit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jdText, companyUrl, daysAvailable } = req.body;
      if (!jdText || typeof jdText !== 'string' || !jdText.trim()) {
        throw new AppError('Job description (jdText) is required', 400, ErrorCode.INVALID_INPUT);
      }
      if (!companyUrl || typeof companyUrl !== 'string' || !companyUrl.trim()) {
        throw new AppError('Company website URL is required', 400, ErrorCode.INVALID_INPUT);
      }
      const days = parseInt(daysAvailable, 10);
      if (isNaN(days) || days < 1 || days > 730) {
        throw new AppError('daysAvailable must be a number between 1 and 730', 400, ErrorCode.INVALID_INPUT);
      }

      const kit = await KitService.createKit(req.userId!, jdText.trim(), companyUrl.trim(), days);
      res.status(201).json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kits/bulk — Create and initiate pipeline for multiple cases.
   */
  static async createBulkKits(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cases } = req.body;
      if (!Array.isArray(cases) || cases.length === 0) {
        throw new AppError('cases must be a non-empty array of objects', 400, ErrorCode.INVALID_INPUT);
      }

      const kitIds = await KitService.createBulkKits(req.userId!, cases);
      res.status(201).json({ kitIds, count: kitIds.length });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/kits/:id — Update fields of a prep kit.
   */
  static async updateKit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const kit = await KitService.updateKit(kitId, req.userId!, req.body);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/kits/:id — Delete a prep kit.
   */
  static async deleteKit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      await KitService.deleteKit(kitId, req.userId!);
      res.json({ message: 'Kit deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kits/:id/regenerate/:section — Regenerate a single section of a kit.
   */
  static async regenerateSection(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const section = getParam(req.params.section);
      const appendCount = req.query.appendCount ? parseInt(req.query.appendCount as string, 10) : undefined;
      const kit = await KitService.regenerateSection(kitId, req.userId!, section, appendCount);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/kits/:id/items — Add an item to the kit
   */
  static async addItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const { type, data } = req.body;
      const kit = await KitService.addItem(kitId, req.userId!, type, data);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/kits/:id/items/:itemId — Update an item in the kit
   */
  static async updateItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const itemId = getParam(req.params.itemId);
      const { type, data } = req.body;
      const kit = await KitService.updateItem(kitId, req.userId!, type, itemId, data);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/kits/:id/items/:itemId — Delete an item from the kit
   */
  static async deleteItem(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const kitId = getParam(req.params.id);
      const itemId = getParam(req.params.itemId);
      const type = getParam(req.query.type as string);
      const kit = await KitService.deleteItem(kitId, req.userId!, type as 'question' | 'flashcard', itemId);
      res.json({ kit });
    } catch (error) {
      next(error);
    }
  }
}
