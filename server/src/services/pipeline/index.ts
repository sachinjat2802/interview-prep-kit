/**
 * Pipeline Factory — Factory Pattern for composing pipelines.
 * 
 * Creates pre-configured pipelines with the correct steps.
 * This is the single place where pipeline composition is defined.
 * 
 * Also serves as the main entry point for running the pipeline
 * (replaces the old procedural `runPipeline` function).
 */

import { PipelineRunner } from '../../core/pipeline.js';
import { KitPipelineContext, createPipelineContext } from './context.js';
import {
  ExtractRequirementsStep,
  ResearchCompanyStep,
  GenerateCompanyBriefStep,
  GenerateQuestionsStep,
  GenerateFlashcardsStep,
  CoverageCheckStep,
  BuildScheduleStep,
  AssembleKitStep,
} from './steps.js';
import { LLMClient } from '../llm/client.js';
import { getGeminiClient } from '../llm/gemini.js';
import { KitStructure } from './validator.js';
import { ProgressCallback } from '../llm/client.js';
import { eventBus, PipelineEvent } from '../../core/eventBus.js';

export interface PipelineInput {
  kitId?: string;
  userId?: string;
  jdText: string;
  companyUrl: string;
  daysAvailable: number;
  allowPrivate?: boolean;
}

export interface PipelineResult {
  kit: KitStructure;
  errors: string[];
}

/**
 * Factory that creates a fully configured pipeline runner.
 * Open for extension — add new steps by registering them here.
 */
export function createKitPipeline(): PipelineRunner<KitPipelineContext> {
  const runner = new PipelineRunner<KitPipelineContext>();

  // Register all steps in order
  runner
    .addStep(new ExtractRequirementsStep())
    .addStep(new ResearchCompanyStep())
    .addStep(new GenerateCompanyBriefStep())
    .addStep(new GenerateQuestionsStep())
    .addStep(new GenerateFlashcardsStep())
    .addStep(new CoverageCheckStep())
    .addStep(new BuildScheduleStep())
    .addStep(new AssembleKitStep());

  return runner;
}

/**
 * Run the full pipeline — convenience function that creates the runner,
 * context, and executes.
 * 
 * This is the function imported by both:
 * - The API server (for web-based generation)
 * - The batch script (for CLI-based generation)
 * 
 * Same code, same steps, same logic.
 */
export async function runPipeline(
  input: PipelineInput,
  llm?: LLMClient,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const client = llm || getGeminiClient();
  const runId = input.kitId || `run_${Date.now()}`;

  // Create context
  const context = createPipelineContext(
    runId,
    input.jdText,
    input.companyUrl,
    input.daysAvailable,
    client,
    input.allowPrivate
  );

  // Wire up progress callback if provided
  if (onProgress) {
    const progressHandler = (payload: { kitId: string; step: number; totalSteps: number; message: string }) => {
      if (payload.kitId === runId) {
        onProgress(payload.step, payload.totalSteps, payload.message);
      }
    };
    eventBus.on(PipelineEvent.PROGRESS, progressHandler);

    // Clean up after pipeline completes
    const cleanup = () => {
      eventBus.off(PipelineEvent.PROGRESS, progressHandler);
    };
    eventBus.once(PipelineEvent.PIPELINE_COMPLETE, cleanup);
    eventBus.once(PipelineEvent.PIPELINE_FAILED, cleanup);
  }

  // Create and execute pipeline
  const pipeline = createKitPipeline();
  const result = await pipeline.execute(context);

  return {
    kit: result.data.kit as KitStructure,
    errors: result.errors,
  };
}
