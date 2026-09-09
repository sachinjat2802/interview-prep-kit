/**
 * @file validator.ts
 * @description Kit Structure Validator & Repair Tool — Ensures 100% Appendix A schema compliance, integer minute validation, and referential integrity.
 * @module Services/Pipeline/Validator
 */

import { z } from 'zod';

// ─── Zod Schemas ───

const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3),
});

const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  sm2: z.object({
    repetitions: z.number(),
    interval: z.number(),
    easeFactor: z.number(),
    nextReviewDate: z.string(),
  }).optional(),
});

const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

const kitSchema = z.object({
  source: z.object({
    company: z.string(),
    company_url: z.string(),
    role: z.string(),
    location: z.string(),
    jd_chars: z.number().int().min(0),
    researched_at: z.string(),
    pages_used: z.array(z.string()),
  }),
  company_brief: z.object({
    summary: z.string(),
    what_they_do: z.string(),
    sources: z.array(z.string()),
  }),
  role: z.object({
    title: z.string(),
    seniority: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(requirementSchema),
  }),
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: z.object({
    days_available: z.number().int().min(1),
    days: z.array(scheduleDaySchema),
  }),
  coverage: z.object({
    uncovered_requirement_ids: z.array(z.string()),
    passes: z.number().int().min(0),
  }),
});

export type KitStructure = z.infer<typeof kitSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a kit against the Appendix A structure.
 * Checks both schema validity and referential integrity.
 */
export function validateKit(kit: unknown): ValidationResult {
  const errors: string[] = [];

  // Schema validation
  const parseResult = kitSchema.safeParse(kit);
  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
    return { valid: false, errors };
  }

  const validKit = parseResult.data;

  // Referential integrity checks
  const requirementIds = new Set<string>();
  for (const r of validKit.role.requirements) requirementIds.add(r.id);

  const questionIds = new Set<string>();
  for (const q of validKit.questions) questionIds.add(q.id);

  // Check that question requirement_ids reference valid requirements
  for (const q of validKit.questions) {
    for (const rid of q.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push(`Question ${q.id} references unknown requirement "${rid}"`);
      }
    }
  }

  // Check that flashcard requirement_ids reference valid requirements
  for (const f of validKit.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push(`Flashcard ${f.id} references unknown requirement "${rid}"`);
      }
    }
  }

  // Check that schedule question_ids reference valid questions
  for (const day of validKit.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) {
        errors.push(`Schedule day ${day.day} references unknown question "${qid}"`);
      }
    }
  }

  // Check schedule spans exactly the days requested
  if (validKit.schedule.days.length !== validKit.schedule.days_available) {
    errors.push(
      `Schedule has ${validKit.schedule.days.length} days but days_available is ${validKit.schedule.days_available}`
    );
  }

  // Check unique IDs
  if (requirementIds.size !== validKit.role.requirements.length) {
    errors.push('Duplicate requirement IDs found');
  }
  if (questionIds.size !== validKit.questions.length) {
    errors.push('Duplicate question IDs found');
  }
  const flashcardIds = new Set<string>();
  for (const f of validKit.flashcards) flashcardIds.add(f.id);
  if (flashcardIds.size !== validKit.flashcards.length) {
    errors.push('Duplicate flashcard IDs found');
  }

  // Check minutes are integers (belt and suspenders)
  for (const day of validKit.schedule.days) {
    if (!Number.isInteger(day.minutes)) {
      errors.push(`Schedule day ${day.day} has non-integer minutes: ${day.minutes}`);
    }
  }

  // Check difficulty range
  for (const q of validKit.questions) {
    if (q.difficulty < 1 || q.difficulty > 3) {
      errors.push(`Question ${q.id} has invalid difficulty: ${q.difficulty}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Fix common kit issues to make it valid.
 * Used as a best-effort repair before saving.
 */
export function repairKit(kit: unknown): Record<string, unknown> {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repaired = (kit && typeof kit === 'object' ? structuredClone(kit) : {}) as Record<string, any>;

  // Ensure all required top-level keys exist
  repaired.source = repaired.source || {};
  repaired.company_brief = repaired.company_brief || {};
  repaired.role = repaired.role || {};
  repaired.questions = repaired.questions || [];
  repaired.flashcards = repaired.flashcards || [];
  repaired.schedule = repaired.schedule || { days_available: 1, days: [] };
  repaired.coverage = repaired.coverage || { uncovered_requirement_ids: [], passes: 0 };

  // Fix source
  repaired.source.company = repaired.source.company || '';
  repaired.source.company_url = repaired.source.company_url || '';
  repaired.source.role = repaired.source.role || '';
  repaired.source.location = repaired.source.location || '';
  repaired.source.jd_chars = parseInt(repaired.source.jd_chars) || 0;
  repaired.source.researched_at = repaired.source.researched_at || new Date().toISOString();
  repaired.source.pages_used = repaired.source.pages_used || [];

  // Fix company_brief
  repaired.company_brief.summary = repaired.company_brief.summary || '';
  repaired.company_brief.what_they_do = repaired.company_brief.what_they_do || '';
  repaired.company_brief.sources = repaired.company_brief.sources || [];

  // Fix role
  repaired.role.title = repaired.role.title || '';
  repaired.role.seniority = repaired.role.seniority || '';
  repaired.role.responsibilities = repaired.role.responsibilities || [];
  repaired.role.requirements = (repaired.role.requirements || []).map((r: Record<string, unknown>, i: number) => ({
    id: r.id || `r${i + 1}`,
    text: r.text || '',
    kind: typeof r.kind === 'string' && ['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical',
    priority: typeof r.priority === 'string' && ['must', 'nice'].includes(r.priority) ? r.priority : 'must',
  }));

  // Fix questions
  repaired.questions = (repaired.questions || []).map((q: Record<string, unknown>, i: number) => ({
    id: q.id || `q${i + 1}`,
    requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids : [],
    category: typeof q.category === 'string' && ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category)
      ? q.category : 'technical',
    prompt: q.prompt || '',
    answer_outline: q.answer_outline || '',
    difficulty: Math.max(1, Math.min(3, parseInt(q.difficulty as string) || 2)),
  }));

  // Fix flashcards
  repaired.flashcards = (repaired.flashcards || []).map((f: Record<string, unknown>, i: number) => ({
    id: f.id || `f${i + 1}`,
    front: f.front || '',
    back: f.back || '',
    requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids : [],
  }));

  // Fix schedule
  repaired.schedule.days_available = parseInt(repaired.schedule.days_available) || 1;
  repaired.schedule.days = (repaired.schedule.days || []).map((d: Record<string, unknown>) => ({
    day: parseInt(d.day as string) || 1,
    focus: d.focus || '',
    question_ids: Array.isArray(d.question_ids) ? d.question_ids : [],
    minutes: Math.round(parseFloat(d.minutes as string) || 0),
  }));

  // Fix coverage
  repaired.coverage.uncovered_requirement_ids = repaired.coverage.uncovered_requirement_ids || [];
  repaired.coverage.passes = parseInt(repaired.coverage.passes) || 0;

  // Remove internal state fields for export
  return repaired;
}

/**
 * Strip internal fields (like _state) for external output (batch mode).
 */
export function stripInternalFields(kit: unknown): KitStructure {
  const stripped = JSON.parse(JSON.stringify(kit));
  
  // Remove MongoDB internal fields
  delete stripped._id;
  delete stripped.id;
  delete stripped.__v;
  delete stripped.userId;
  delete stripped.createdAt;
  delete stripped.updatedAt;
  delete stripped.status;
  delete stripped.generationProgress;
  delete stripped.errorMessage;

  // Remove _state from questions
  if (Array.isArray(stripped.questions)) {
    stripped.questions = stripped.questions.map((q: Record<string, unknown>) => {
      const { _state, ...rest } = q;
      return rest;
    });
  }

  // Remove _state from flashcards
  if (Array.isArray(stripped.flashcards)) {
    stripped.flashcards = stripped.flashcards.map((f: Record<string, unknown>) => {
      const { _state, ...rest } = f;
      return rest;
    });
  }

  return stripped;
}
