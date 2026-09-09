/**
 * @file domain.ts
 * @description Centralized Domain Enums & Type Definitions — Appendix A schema types and domain enums for the server application.
 * @module Types/Domain
 */

/**
 * Question Category Enum (Appendix A).
 */
export enum QuestionCategory {
  TECHNICAL = 'technical',
  BEHAVIOURAL = 'behavioural',
  SYSTEM_DESIGN = 'system-design',
  COMPANY_FIT = 'company-fit',
}

/**
 * Requirement Classification Kind Enum (Appendix A).
 */
export enum RequirementKind {
  TECHNICAL = 'technical',
  BEHAVIOURAL = 'behavioural',
  DOMAIN = 'domain',
}

/**
 * Requirement Priority Enum (Appendix A).
 */
export enum RequirementPriority {
  MUST = 'must',
  NICE = 'nice',
}

/**
 * Item Reshape State Enum (Appendix A & Section 6).
 */
export enum ItemState {
  GENERATED = 'generated',
  EDITED = 'edited',
  USER_CREATED = 'user_created',
}

/**
 * Kit Generation Lifecycle Status Enum.
 */
export enum KitStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

/**
 * Extracted Role Requirement interface matching Appendix A.
 */
export interface RequirementDomain {
  id: string;
  text: string;
  kind: RequirementKind | 'technical' | 'behavioural' | 'domain';
  priority: RequirementPriority | 'must' | 'nice';
}

/**
 * Prep Question interface matching Appendix A.
 */
export interface QuestionDomain {
  id: string;
  requirement_ids: string[];
  category: QuestionCategory | 'technical' | 'behavioural' | 'system-design' | 'company-fit';
  prompt: string;
  answer_outline: string;
  difficulty: number; // 1 to 3
  _state?: ItemState | 'generated' | 'edited' | 'user_created';
}

/**
 * Revision Flashcard interface matching Appendix A.
 */
export interface FlashcardDomain {
  id: string;
  front: string;
  back: string;
  requirement_ids: string[];
  _state?: ItemState | 'generated' | 'edited' | 'user_created';
}
