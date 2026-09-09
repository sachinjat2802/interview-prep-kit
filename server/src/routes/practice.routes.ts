/**
 * @file practice.routes.ts
 * @description Routing Layer for Practice Endpoints — Delegates flashcard practice HTTP requests to PracticeController.
 * @module Routes/PracticeRoutes
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { PracticeController } from '../controllers/practice.controller.js';

const router = Router();

// Require authentication for practice endpoints
router.use(authenticate);

// Session lifecycle endpoints
router.post('/:kitId/session', PracticeController.startSession);
router.put('/:kitId/session/:sessionId/card/:cardId', PracticeController.recordConfidence);
router.put('/:kitId/session/:sessionId/complete', PracticeController.completeSession);

// Statistics endpoint
router.get('/:kitId/stats', PracticeController.getPracticeStats);

export default router;
