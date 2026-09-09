/**
 * @file types.ts
 * @description Frontend Domain Types & Enums — Appendix A kit schema interfaces and domain enums.
 * @module Client/Types
 */

/**
 * Question Category Enum.
 */
export enum QuestionCategory {
  TECHNICAL = 'technical',
  BEHAVIOURAL = 'behavioural',
  SYSTEM_DESIGN = 'system-design',
  COMPANY_FIT = 'company-fit',
}

/**
 * Requirement Kind Enum.
 */
export enum RequirementKind {
  TECHNICAL = 'technical',
  BEHAVIOURAL = 'behavioural',
  DOMAIN = 'domain',
}

/**
 * Requirement Priority Enum.
 */
export enum RequirementPriority {
  MUST = 'must',
  NICE = 'nice',
}

/**
 * Reshape State Enum for generated vs user edited items.
 */
export enum ItemState {
  GENERATED = 'generated',
  EDITED = 'edited',
  USER_CREATED = 'user_created',
}

/**
 * Kit Status Enum.
 */
export enum KitStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

// ─── Kit Structure Interfaces (matching Appendix A) ───

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string;
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface Requirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

export interface Role {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Question {
  id: string;
  requirement_ids: string[];
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
  prompt: string;
  answer_outline: string;
  difficulty: number;
  _state?: 'generated' | 'edited' | 'user_created';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _state?: 'generated' | 'edited' | 'user_created';
  sm2?: {
    repetitions: number;
    interval: number;
    easeFactor: number;
    nextReviewDate: string;
  };
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number;
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface Kit {
  _id: string;
  userId: string;
  status: 'pending' | 'generating' | 'ready' | 'failed';
  generationProgress: {
    step: number;
    totalSteps: number;
    message: string;
  };
  errorMessage?: string;
  jdText: string;
  companyUrl: string;
  daysAvailable: number;
  source: KitSource;
  company_brief: CompanyBrief;
  role: Role;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
