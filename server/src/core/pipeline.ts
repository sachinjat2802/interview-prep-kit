/**
 * Pipeline Pattern — Chain of Responsibility with typed context.
 * 
 * Each pipeline step is an independent unit with:
 * - A name for logging/progress
 * - An execute method that receives mutable context
 * - Error isolation — one step failing doesn't crash others
 * 
 * The PipelineRunner composes steps and manages execution order,
 * progress reporting, and error collection.
 * 
 * This pattern ensures:
 * 1. Each step is testable in isolation
 * 2. Steps can be reordered or swapped
 * 3. New steps can be added without modifying existing ones (OCP)
 * 4. Progress is reported uniformly
 */

import { eventBus, PipelineEvent } from './eventBus.js';

export interface PipelineContext {
  /** Unique ID for this pipeline run (kit ID or batch case ID) */
  runId: string;
  /** Accumulated errors (non-fatal) */
  errors: string[];
  /** Arbitrary data passed between steps */
  data: Record<string, unknown>;
}

export interface PipelineStep<TContext extends PipelineContext = PipelineContext> {
  /** Human-readable name for progress reporting */
  readonly name: string;
  /** Step number for ordering */
  readonly order: number;
  /** Whether this step is critical (pipeline aborts on failure) */
  readonly critical: boolean;

  /**
   * Execute this step, mutating the context.
   * @throws if the step fails critically
   */
  execute(context: TContext): Promise<void>;
}

export class PipelineRunner<TContext extends PipelineContext = PipelineContext> {
  private steps: PipelineStep<TContext>[] = [];

  /**
   * Register a step. Steps are executed in order of their `order` property.
   */
  addStep(step: PipelineStep<TContext>): this {
    this.steps.push(step);
    this.steps.sort((a, b) => a.order - b.order);
    return this;
  }

  /**
   * Execute all registered steps in order.
   * 
   * - Critical steps abort the pipeline on failure
   * - Non-critical steps log errors and continue
   * - Progress is reported via the event bus
   */
  async execute(context: TContext): Promise<TContext> {
    const totalSteps = this.steps.length;

    eventBus.emit(PipelineEvent.PIPELINE_START, {
      kitId: context.runId,
      totalSteps,
    });

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const stepNum = i + 1;

      const progressPayload = {
        kitId: context.runId,
        step: stepNum,
        totalSteps,
        stepName: step.name,
        message: `${step.name}...`,
        timestamp: new Date(),
      };

      try {
        eventBus.emit(PipelineEvent.STEP_START, progressPayload);
        eventBus.emit(PipelineEvent.PROGRESS, progressPayload);

        await step.execute(context);

        eventBus.emit(PipelineEvent.STEP_COMPLETE, {
          ...progressPayload,
          message: `${step.name} complete`,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        eventBus.emit(PipelineEvent.STEP_FAILED, {
          ...progressPayload,
          message: `${step.name} failed: ${err.message}`,
          error: err,
        });

        if (step.critical) {
          eventBus.emit(PipelineEvent.PIPELINE_FAILED, {
            kitId: context.runId,
            error: err,
          });
          throw new Error(`Pipeline aborted at step "${step.name}": ${err.message}`);
        }

        // Non-critical: log error and continue
        context.errors.push(`${step.name}: ${err.message}`);
        console.warn(`[Pipeline] Non-critical step "${step.name}" failed:`, err.message);
      }
    }

    eventBus.emit(PipelineEvent.PIPELINE_COMPLETE, {
      kitId: context.runId,
      errors: context.errors,
    });

    return context;
  }

  /** Get the total number of registered steps */
  get stepCount(): number {
    return this.steps.length;
  }

  /** Get step names in execution order */
  get stepNames(): string[] {
    return this.steps.map(s => s.name);
  }
}

/**
 * Abstract base class for pipeline steps with common boilerplate.
 * Subclasses only need to implement `run()`.
 */
export abstract class BasePipelineStep<TContext extends PipelineContext = PipelineContext>
  implements PipelineStep<TContext> {

  abstract readonly name: string;
  abstract readonly order: number;
  readonly critical: boolean = false;

  async execute(context: TContext): Promise<void> {
    console.log(`[Pipeline] Step ${this.order}: ${this.name}`);
    await this.run(context);
  }

  protected abstract run(context: TContext): Promise<void>;
}
