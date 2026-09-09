import { describe, it, expect } from 'vitest';
import { buildSchedule, findUnscheduledMustHaves } from '../server/src/services/pipeline/scheduler.js';

describe('Schedule Allocator', () => {
  const makeQuestion = (id: string, reqIds: string[], category: string, difficulty: number) => ({
    id, requirement_ids: reqIds, category, difficulty,
  });

  const makeReq = (id: string, priority: 'must' | 'nice') => ({ id, priority });

  it('should produce exactly the requested number of days', () => {
    const questions = [
      makeQuestion('q1', ['r1'], 'technical', 2),
      makeQuestion('q2', ['r2'], 'behavioural', 1),
      makeQuestion('q3', ['r3'], 'system-design', 3),
    ];
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'nice')];

    for (const days of [1, 3, 5, 7, 60]) {
      const schedule = buildSchedule(questions, requirements, days);
      expect(schedule.days_available).toBe(days);
      expect(schedule.days).toHaveLength(days);
    }
  });

  it('should schedule harder/higher-priority material earlier', () => {
    const questions = [
      makeQuestion('q_easy', ['r_nice'], 'technical', 1),
      makeQuestion('q_hard', ['r_must'], 'technical', 3),
      makeQuestion('q_med', ['r_must2'], 'behavioural', 2),
    ];
    const requirements = [
      makeReq('r_must', 'must'),
      makeReq('r_must2', 'must'),
      makeReq('r_nice', 'nice'),
    ];

    const schedule = buildSchedule(questions, requirements, 3);
    
    // Day 1 should contain the hardest must-have question
    expect(schedule.days[0].question_ids).toContain('q_hard');
  });

  it('should produce integer minutes for every day', () => {
    const questions = Array.from({ length: 7 }, (_, i) =>
      makeQuestion(`q${i}`, [`r${i % 3}`], 'technical', ((i % 3) + 1))
    );
    const requirements = [makeReq('r0', 'must'), makeReq('r1', 'must'), makeReq('r2', 'nice')];

    const schedule = buildSchedule(questions, requirements, 4);
    
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it('should handle 0 questions gracefully', () => {
    const schedule = buildSchedule([], [], 5);
    expect(schedule.days).toHaveLength(5);
    expect(schedule.days.every(d => d.question_ids.length === 0)).toBe(true);
  });

  it('should handle 1-day schedule', () => {
    const questions = [
      makeQuestion('q1', ['r1'], 'technical', 3),
      makeQuestion('q2', ['r2'], 'behavioural', 2),
    ];
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must')];

    const schedule = buildSchedule(questions, requirements, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids).toContain('q1');
    expect(schedule.days[0].question_ids).toContain('q2');
  });

  it('should handle more days than questions', () => {
    const questions = [makeQuestion('q1', ['r1'], 'technical', 2)];
    const requirements = [makeReq('r1', 'must')];

    const schedule = buildSchedule(questions, requirements, 10);
    expect(schedule.days).toHaveLength(10);
    
    // Only some days should have questions
    const daysWithQuestions = schedule.days.filter(d => d.question_ids.length > 0);
    expect(daysWithQuestions.length).toBeGreaterThanOrEqual(1);
  });

  it('should include every must-have requirement somewhere', () => {
    const questions = [
      makeQuestion('q1', ['r1'], 'technical', 2),
      makeQuestion('q2', ['r2'], 'behavioural', 1),
      makeQuestion('q3', ['r3'], 'system-design', 3),
    ];
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'must')];

    const schedule = buildSchedule(questions, requirements, 3);
    const unscheduled = findUnscheduledMustHaves(schedule, questions, requirements);
    expect(unscheduled).toHaveLength(0);
  });
});
