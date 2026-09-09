import { LLMClient } from '../llm/client.js';
import {
  companyBriefPrompt,
  generateQuestionsPrompt,
  generateFlashcardsPrompt,
  fillCoverageGapsPrompt,
  regenerateQuestionsPrompt,
} from '../llm/prompts.js';

// ─── Types ───

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
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
}

export interface Requirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

// ─── Company Brief ───

export async function generateCompanyBrief(
  companyUrl: string,
  crawledContent: string,
  llm: LLMClient
): Promise<CompanyBrief> {
  const prompt = companyBriefPrompt(companyUrl, crawledContent || '');
  try {
    const result = await llm.generateJSON<CompanyBrief>(prompt);
    return {
      summary: result.summary || `Company profile for ${companyUrl}.`,
      what_they_do: result.what_they_do || `Enterprise solutions and technology services.`,
    };
  } catch (error) {
    console.warn('[Generator] Failed to generate company brief, using fallback:', error);
    return {
      summary: `Company profile derived from ${companyUrl}.`,
      what_they_do: `Provides products, solutions, and consulting services.`,
    };
  }
}

// ─── Questions ───

const CATEGORIES: Array<'technical' | 'behavioural' | 'system-design' | 'company-fit'> = [
  'technical', 'behavioural', 'system-design', 'company-fit',
];

export async function generateAllQuestions(
  requirements: Requirement[],
  companyBrief: string,
  hiringInfo: string,
  daysAvailable: number,
  llm: LLMClient,
  roleTitle: string = 'Job Candidate'
): Promise<Question[]> {
  const allQuestions: Question[] = [];
  let nextId = 1;

  // Generate questions for all categories concurrently via Promise.allSettled for maximum throughput
  const categoryPromises = CATEGORIES.map(category => {
    const prompt = generateQuestionsPrompt(
      category,
      requirements,
      companyBrief,
      hiringInfo,
      nextId,
      daysAvailable,
      roleTitle
    );
    return llm.generateJSON<{ questions: Question[] }>(prompt).then(res => ({ category, result: res }));
  });

  const settled = await Promise.allSettled(categoryPromises);

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      const { category, result } = item.value;
      if (Array.isArray(result?.questions)) {
        const validated = result.questions.map(q => {
          const v = validateQuestion(q, nextId, category);
          v.id = `q${nextId}`;
          nextId++;
          return v;
        });
        allQuestions.push(...validated);
      }
    } else {
      console.warn(`[Generator] Failed to generate category questions:`, item.reason);
    }
  }

  return allQuestions;
}

export async function regenerateQuestionsForCategory(
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit',
  requirements: Requirement[],
  companyBrief: string,
  hiringInfo: string,
  preservedQuestions: Question[],
  startId: number,
  llm: LLMClient,
  roleTitle: string = 'Job Candidate',
  appendCount?: number
): Promise<Question[]> {
  const prompt = regenerateQuestionsPrompt(
    category,
    requirements,
    companyBrief,
    hiringInfo,
    preservedQuestions.map(q => ({ id: q.id, prompt: q.prompt })),
    startId,
    roleTitle,
    appendCount
  );

  const result = await llm.generateJSON<{ questions: Question[] }>(prompt);
  
  if (Array.isArray(result.questions)) {
    return result.questions.map(q => validateQuestion(q, startId++, category));
  }
  return [];
}

// ─── Flashcards ───

export async function generateFlashcards(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number,
  llm: LLMClient,
  roleTitle: string = 'Job Candidate'
): Promise<Flashcard[]> {
  const prompt = generateFlashcardsPrompt(
    requirements,
    questions.map(q => ({
      prompt: q.prompt,
      answer_outline: q.answer_outline,
      requirement_ids: q.requirement_ids,
    })),
    daysAvailable,
    roleTitle
  );

  const result = await llm.generateJSON<{ flashcards: Flashcard[] }>(prompt);
  
  if (Array.isArray(result.flashcards)) {
    return result.flashcards.map((f, i) => ({
      id: f.id || `f${i + 1}`,
      front: f.front || '',
      back: f.back || '',
      requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids : [],
      _state: 'generated' as const,
    }));
  }
  return [];
}

// ─── Coverage Gap Filling ───

export async function fillGaps(
  uncoveredRequirements: Requirement[],
  existingQuestionCount: number,
  llm: LLMClient
): Promise<{ questions: Question[]; flashcards: Flashcard[] }> {
  const prompt = fillCoverageGapsPrompt(uncoveredRequirements, existingQuestionCount);
  const result = await llm.generateJSON<{ questions: Question[]; flashcards: Flashcard[] }>(prompt);

  let qId = existingQuestionCount + 1;
  const questions = Array.isArray(result.questions)
    ? result.questions.map((q) => {
        const validated = validateQuestion(q, qId, q.category);
        // Always override ID to prevent collisions with existing questions
        validated.id = `q${qId}`;
        qId++;
        return validated;
      })
    : [];

  const flashcards = Array.isArray(result.flashcards)
    ? result.flashcards.map((f, i) => ({
        id: `f_gap_${existingQuestionCount + i + 1}`,
        front: f.front || '',
        back: f.back || '',
        requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids : [],
        _state: 'generated' as const,
      }))
    : [];

  return { questions, flashcards };
}

// ─── Validation Helpers ───

function validateQuestion(
  q: Partial<Question>,
  fallbackIdNum: number,
  expectedCategory: string
): Question {
  return {
    id: q.id || `q${fallbackIdNum}`,
    requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids : [],
    category: validateCategory(q.category || expectedCategory),
    prompt: q.prompt || '',
    answer_outline: q.answer_outline || '',
    difficulty: validateDifficulty(q.difficulty),
    _state: 'generated',
  };
}

function validateCategory(cat: string): 'technical' | 'behavioural' | 'system-design' | 'company-fit' {
  if (CATEGORIES.includes(cat as typeof CATEGORIES[number])) return cat as typeof CATEGORIES[number];
  return 'technical';
}

function validateDifficulty(d: unknown): number {
  const n = parseInt(String(d), 10);
  if (n >= 1 && n <= 3) return n;
  return 2;
}
