/**
 * State Machine Pattern — Manages kit lifecycle transitions.
 * 
 * Valid transitions:
 *   pending → generating
 *   generating → ready
 *   generating → failed
 *   ready → generating (regeneration)
 *   failed → generating (retry)
 * 
 * Invalid transitions are rejected with clear error messages.
 * Each transition can trigger side effects via the event bus.
 */

import { eventBus, KitEvent } from './eventBus.js';
import { KitStatus } from '../types/domain.js';

const VALID_TRANSITIONS: Record<KitStatus, KitStatus[]> = {
  [KitStatus.PENDING]: [KitStatus.GENERATING],
  [KitStatus.GENERATING]: [KitStatus.READY, KitStatus.FAILED],
  [KitStatus.READY]: [KitStatus.GENERATING], // For regeneration
  [KitStatus.FAILED]: [KitStatus.GENERATING], // For retry
};

export class KitStateMachine {
  private status: KitStatus;
  private readonly kitId: string;

  constructor(kitId: string, initialStatus: KitStatus = KitStatus.PENDING) {
    this.kitId = kitId;
    this.status = initialStatus;
  }

  get currentStatus(): KitStatus {
    return this.status;
  }

  /**
   * Transition to a new status. Throws if the transition is invalid.
   */
  transition(newStatus: KitStatus, message?: string): void {
    const allowedNextStates = VALID_TRANSITIONS[this.status];

    if (!allowedNextStates.includes(newStatus)) {
      throw new Error(
        `Invalid kit status transition: ${this.status} → ${newStatus}. ` +
        `Allowed: ${allowedNextStates.join(', ')}`
      );
    }

    const previousStatus = this.status;
    this.status = newStatus;

    // Emit state change event (Observer pattern)
    eventBus.emit(KitEvent.STATUS_CHANGED, {
      kitId: this.kitId,
      previousStatus,
      newStatus,
      message,
    });
  }

  /**
   * Check if a transition is valid without performing it.
   */
  canTransition(newStatus: KitStatus): boolean {
    return VALID_TRANSITIONS[this.status].includes(newStatus);
  }
}
