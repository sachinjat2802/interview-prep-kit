import { EventEmitter } from 'events';

/**
 * Observer Pattern — Typed event bus for decoupled communication
 * across services. Replaces direct callbacks with a publish/subscribe model.
 * 
 * This is the backbone for:
 * - Pipeline progress reporting → SSE to frontend
 * - Kit state transitions → side effects (logging, notifications)
 * - Error propagation without tight coupling
 */

export enum PipelineEvent {
  STEP_START = 'pipeline:step:start',
  STEP_COMPLETE = 'pipeline:step:complete',
  STEP_FAILED = 'pipeline:step:failed',
  PIPELINE_START = 'pipeline:start',
  PIPELINE_COMPLETE = 'pipeline:complete',
  PIPELINE_FAILED = 'pipeline:failed',
  PROGRESS = 'pipeline:progress',
  PIPELINE_ERROR = "PIPELINE_ERROR",
}

export enum KitEvent {
  STATUS_CHANGED = 'kit:status:changed',
  SECTION_REGENERATED = 'kit:section:regenerated',
  ITEM_EDITED = 'kit:item:edited',
}

export interface PipelineProgressPayload {
  kitId: string;
  step: number;
  totalSteps: number;
  stepName: string;
  message: string;
  timestamp: Date;
}

export interface KitStatusPayload {
  kitId: string;
  previousStatus: string;
  newStatus: string;
  message?: string;
}

type EventPayloadMap = {
  [PipelineEvent.STEP_START]: PipelineProgressPayload;
  [PipelineEvent.STEP_COMPLETE]: PipelineProgressPayload;
  [PipelineEvent.STEP_FAILED]: PipelineProgressPayload & { error: Error };
  [PipelineEvent.PIPELINE_START]: { kitId: string; totalSteps: number };
  [PipelineEvent.PIPELINE_COMPLETE]: { kitId: string; errors: string[] };
  [PipelineEvent.PIPELINE_FAILED]: { kitId: string; error: Error };
  [PipelineEvent.PROGRESS]: PipelineProgressPayload;
  [KitEvent.STATUS_CHANGED]: KitStatusPayload;
  [KitEvent.SECTION_REGENERATED]: { kitId: string; section: string };
  [KitEvent.ITEM_EDITED]: { kitId: string; itemId: string; itemType: string };
};

class TypedEventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  emit<K extends keyof EventPayloadMap>(event: K, payload: EventPayloadMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof EventPayloadMap>(event: K, handler: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.on(event, handler);
  }

  once<K extends keyof EventPayloadMap>(event: K, handler: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.once(event, handler);
  }

  off<K extends keyof EventPayloadMap>(event: K, handler: (payload: EventPayloadMap[K]) => void): void {
    this.emitter.off(event, handler);
  }

  removeAllListeners(event?: keyof EventPayloadMap): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

/**
 * Singleton event bus instance.
 * All services publish/subscribe through this single bus.
 */
export const eventBus = new TypedEventBus();
