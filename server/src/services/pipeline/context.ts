/**
 * Pipeline Context — Typed context that flows through all pipeline steps.
 * 
 * Each step reads what it needs and writes its output into the context.
 * The KitBuilder in the context accumulates the final kit.
 */

import { PipelineContext } from '../../core/pipeline.js';
import { KitBuilder } from '../../core/kitBuilder.js';
import { LLMClient } from '../llm/client.js';
import { ResearchBundle } from './researcher.js';
import { ExtractedRole } from './extractor.js';
import { Question, Flashcard } from './generator.js';

export interface KitPipelineContext extends PipelineContext {
  /** Input parameters */
  input: {
    jdText: string;
    companyUrl: string;
    daysAvailable: number;
    allowPrivate: boolean;
  };

  /** LLM client (Strategy pattern — injected, not created) */
  llm: LLMClient;

  /** Builder accumulates the kit */
  builder: KitBuilder;

  /** Inter-step data */
  extracted?: ExtractedRole;
  research?: ResearchBundle;
  questions: Question[];
  flashcards: Flashcard[];
}

export function createPipelineContext(
  runId: string,
  jdText: string,
  companyUrl: string,
  daysAvailable: number,
  llm: LLMClient,
  allowPrivate = false
): KitPipelineContext {
  return {
    runId,
    errors: [],
    data: {},
    input: { jdText, companyUrl, daysAvailable, allowPrivate },
    llm,
    builder: new KitBuilder(),
    questions: [],
    flashcards: [],
  };
}
