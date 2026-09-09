import { describe, it, expect } from 'vitest';
import { validateKit, repairKit, stripInternalFields } from '../server/src/services/pipeline/validator.js';

describe('Kit Structure Validator', () => {
  function makeValidKit() {
    return {
      source: {
        company: 'Test Corp',
        company_url: 'https://test.com',
        role: 'Engineer',
        location: 'Remote',
        jd_chars: 500,
        researched_at: '2026-01-01T00:00:00Z',
        pages_used: ['https://test.com'],
      },
      company_brief: {
        summary: 'A test company',
        what_they_do: 'Testing things',
        sources: ['https://test.com'],
      },
      role: {
        title: 'Engineer',
        seniority: 'Senior',
        responsibilities: ['Build things'],
        requirements: [
          { id: 'r1', text: 'React experience', kind: 'technical', priority: 'must' },
          { id: 'r2', text: 'Leadership', kind: 'behavioural', priority: 'nice' },
        ],
      },
      questions: [
        { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Q?', answer_outline: 'A.', difficulty: 2 },
        { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: 'Q?', answer_outline: 'A.', difficulty: 1 },
      ],
      flashcards: [
        { id: 'f1', front: 'Q?', back: 'A.', requirement_ids: ['r1'] },
      ],
      schedule: {
        days_available: 2,
        days: [
          { day: 1, focus: 'Technical', question_ids: ['q1'], minutes: 25 },
          { day: 2, focus: 'Behavioural', question_ids: ['q2'], minutes: 15 },
        ],
      },
      coverage: { uncovered_requirement_ids: [], passes: 2 },
    };
  }

  it('should accept a valid kit', () => {
    const result = validateKit(makeValidKit());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing required fields', () => {
    const kit = makeValidKit();
    delete (kit as unknown as Record<string, unknown>).source;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid difficulty values', () => {
    const kit = makeValidKit();
    kit.questions[0].difficulty = 5;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it('should reject non-integer minutes', () => {
    const kit = makeValidKit();
    kit.schedule.days[0].minutes = 25.5;
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it('should detect mismatched schedule days', () => {
    const kit = makeValidKit();
    kit.schedule.days_available = 5; // but only 2 days
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('days'))).toBe(true);
  });

  it('should detect invalid requirement references in questions', () => {
    const kit = makeValidKit();
    kit.questions[0].requirement_ids = ['r999'];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('r999'))).toBe(true);
  });

  it('should detect invalid question references in schedule', () => {
    const kit = makeValidKit();
    kit.schedule.days[0].question_ids = ['q999'];
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('q999'))).toBe(true);
  });

  it('should detect duplicate IDs', () => {
    const kit = makeValidKit();
    kit.questions[1].id = 'q1'; // duplicate
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  it('should reject invalid category', () => {
    const kit = makeValidKit();
    (kit.questions[0] as unknown as Record<string, unknown>).category = 'invalid';
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid kind', () => {
    const kit = makeValidKit();
    (kit.role.requirements[0] as unknown as Record<string, unknown>).kind = 'invalid';
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });

  it('should reject invalid priority', () => {
    const kit = makeValidKit();
    (kit.role.requirements[0] as unknown as Record<string, unknown>).priority = 'optional';
    const result = validateKit(kit);
    expect(result.valid).toBe(false);
  });
});

describe('Kit Repair', () => {
  it('should add missing fields', () => {
    const broken = { questions: [{ id: 'q1', prompt: 'test' }] };
    const repaired = repairKit(broken);
    expect(repaired.source).toBeDefined();
    expect(repaired.company_brief).toBeDefined();
    expect(repaired.role).toBeDefined();
    expect(repaired.schedule).toBeDefined();
    expect(repaired.coverage).toBeDefined();
  });

  it('should coerce minutes to integers', () => {
    const kit = {
      schedule: {
        days_available: 1,
        days: [{ day: 1, focus: 'test', question_ids: [], minutes: 25.7 }],
      },
    };
    const repaired = repairKit(kit);
    expect(repaired.schedule.days[0].minutes).toBe(26);
    expect(Number.isInteger(repaired.schedule.days[0].minutes)).toBe(true);
  });
});

describe('Strip Internal Fields', () => {
  it('should remove _state from questions and flashcards', () => {
    const kit = {
      source: { company: '', company_url: '', role: '', location: '', jd_chars: 0, researched_at: '', pages_used: [] },
      company_brief: { summary: '', what_they_do: '', sources: [] },
      role: { title: '', seniority: '', responsibilities: [], requirements: [] },
      questions: [{ id: 'q1', requirement_ids: [], category: 'technical', prompt: '', answer_outline: '', difficulty: 1, _state: 'generated' }],
      flashcards: [{ id: 'f1', front: '', back: '', requirement_ids: [], _state: 'edited' }],
      schedule: { days_available: 1, days: [] },
      coverage: { uncovered_requirement_ids: [], passes: 0 },
    };
    
    const stripped = stripInternalFields(kit);
    expect((stripped.questions[0] as unknown as Record<string, unknown>)._state).toBeUndefined();
    expect((stripped.flashcards[0] as unknown as Record<string, unknown>)._state).toBeUndefined();
  });
});
