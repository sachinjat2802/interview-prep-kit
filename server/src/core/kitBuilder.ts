/**
 * Builder Pattern — Incremental kit assembly.
 * 
 * The kit is complex and assembled over multiple pipeline steps.
 * The Builder pattern provides:
 * - Fluent API for step-by-step construction
 * - Validation at build time
 * - Clear separation between construction and representation
 * - Immutable output (the built kit)
 */

import { KitStructure } from '../services/pipeline/validator.js';

export class KitBuilder {
  private kit: Partial<KitStructure> = {
    source: { company: '', company_url: '', role: '', location: '', jd_chars: 0, researched_at: '', pages_used: [] },
    company_brief: { summary: '', what_they_do: '', sources: [] },
    role: { title: '', seniority: '', responsibilities: [], requirements: [] },
    questions: [],
    flashcards: [],
    schedule: { days_available: 1, days: [] },
    coverage: { uncovered_requirement_ids: [], passes: 0 },
  };

  setSource(source: Partial<KitStructure['source']>): this {
    this.kit.source = { ...(this.kit.source as KitStructure['source']), ...source };
    return this;
  }

  setCompanyBrief(brief: Partial<KitStructure['company_brief']>): this {
    this.kit.company_brief = { ...(this.kit.company_brief as KitStructure['company_brief']), ...brief };
    return this;
  }

  setRole(role: Partial<KitStructure['role']>): this {
    this.kit.role = { ...(this.kit.role as KitStructure['role']), ...role };
    return this;
  }

  setQuestions(questions: KitStructure['questions']): this {
    this.kit.questions = questions;
    return this;
  }

  addQuestions(questions: KitStructure['questions']): this {
    this.kit.questions = [...(this.kit.questions || []), ...questions];
    return this;
  }

  setFlashcards(flashcards: KitStructure['flashcards']): this {
    this.kit.flashcards = flashcards;
    return this;
  }

  addFlashcards(flashcards: KitStructure['flashcards']): this {
    this.kit.flashcards = [...(this.kit.flashcards || []), ...flashcards];
    return this;
  }

  setSchedule(schedule: KitStructure['schedule']): this {
    this.kit.schedule = schedule;
    return this;
  }

  setCoverage(coverage: KitStructure['coverage']): this {
    this.kit.coverage = coverage;
    return this;
  }

  /**
   * Build the final kit. Returns a deep copy to prevent mutation.
   */
  build(): KitStructure {
    // Set researched_at if not already set
    if (this.kit.source && !this.kit.source.researched_at) {
      this.kit.source.researched_at = new Date().toISOString();
    }
    return JSON.parse(JSON.stringify(this.kit));
  }

  /**
   * Get the current (mutable) state for pipeline steps to read.
   */
  current(): Partial<KitStructure> {
    return this.kit;
  }
}
