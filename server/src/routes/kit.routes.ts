/**
 * @file kit.routes.ts
 * @description Routing Layer for Kit Endpoints — Routes incoming HTTP requests to KitController and manages SSE streaming sessions.
 * @module Routes/KitRoutes
 */

import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { KitController } from '../controllers/kit.controller.js';
import { KitService } from '../services/kit.service.js';
import { KitStatus } from '../types/domain.js';
import { eventBus, PipelineEvent } from '../core/eventBus.js';

const router = Router();

// Require authentication for all kit endpoints
router.use(authenticate);

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// ─── SSE Client Registry ───

class SSEClientRegistry {
  private clients = new Map<string, Set<Response>>();

  register(kitId: string, res: Response): void {
    if (!this.clients.has(kitId)) {
      this.clients.set(kitId, new Set());
    }
    this.clients.get(kitId)!.add(res);
  }

  unregister(kitId: string, res: Response): void {
    this.clients.get(kitId)?.delete(res);
    if (this.clients.get(kitId)?.size === 0) {
      this.clients.delete(kitId);
    }
  }

  broadcast(kitId: string, data: object): void {
    const clients = this.clients.get(kitId);
    if (!clients) return;
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of clients) {
      client.write(message);
    }
  }

  closeAll(kitId: string): void {
    const clients = this.clients.get(kitId);
    if (!clients) return;
    for (const client of clients) {
      client.end();
    }
    this.clients.delete(kitId);
  }
}

const sseRegistry = new SSEClientRegistry();

// Event bus subscriptions for SSE progress streaming
eventBus.on(PipelineEvent.STEP_START, (evt) => {
  sseRegistry.broadcast(evt.kitId, {
    step: evt.step,
    totalSteps: evt.totalSteps,
    message: evt.message,
    status: KitStatus.GENERATING,
  });
});

eventBus.on(PipelineEvent.STEP_COMPLETE, (evt) => {
  sseRegistry.broadcast(evt.kitId, {
    step: evt.step,
    totalSteps: evt.totalSteps,
    message: evt.message,
    status: KitStatus.GENERATING,
  });
});

eventBus.on(PipelineEvent.PIPELINE_COMPLETE, (evt) => {
  sseRegistry.broadcast(evt.kitId, {
    step: 8,
    totalSteps: 8,
    message: 'Kit generation complete!',
    status: KitStatus.READY,
  });
  sseRegistry.closeAll(evt.kitId);
});

eventBus.on(PipelineEvent.PIPELINE_FAILED, (evt) => {
  sseRegistry.broadcast(evt.kitId, {
    step: 0,
    totalSteps: 8,
    message: `Failed: ${evt.error}`,
    status: KitStatus.FAILED,
    error: evt.error,
  });
  sseRegistry.closeAll(evt.kitId);
});

// ─── Route Declarations (Delegating to KitController) ───

router.get('/', KitController.listKits);
router.get('/:id', KitController.getKit);
router.post('/', KitController.createKit);
router.post('/bulk', KitController.createBulkKits);
router.put('/:id', KitController.updateKit);
router.delete('/:id', KitController.deleteKit);
router.post('/:id/regenerate/:section', KitController.regenerateSection);
router.post('/:id/items', KitController.addItem);
router.put('/:id/items/:itemId', KitController.updateItem);
router.delete('/:id/items/:itemId', KitController.deleteItem);

// ─── Study Mode Endpoint ───
import { StudyController } from '../controllers/study.controller.js';
router.post('/:id/questions/:questionId/study', StudyController.handleStudyAction);

// ─── SSE Progress Endpoint ───

router.get('/:id/progress', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const kitId = getParam(req.params.id);
    const kit = await KitService.getKitById(kitId, req.userId!);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    sseRegistry.register(kitId, res);

    res.write(`data: ${JSON.stringify({
      step: kit.generationProgress?.step || 0,
      totalSteps: kit.generationProgress?.totalSteps || 8,
      message: kit.generationProgress?.message || 'Starting...',
      status: kit.status,
    })}\n\n`);

    req.on('close', () => sseRegistry.unregister(kitId, res));
  } catch (error) {
    next(error);
  }
});

export default router;
