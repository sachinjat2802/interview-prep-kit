import { describe, it, expect } from 'vitest';
import { checkCoverage, getUncoveredRequirements } from '../server/src/services/pipeline/coverage.js';

describe('Coverage Checker', () => {
  const makeReq = (id: string, priority: 'must' | 'nice') => ({
    id, text: `Requirement ${id}`, kind: 'technical', priority,
  });

  const makeQuestion = (id: string, reqIds: string[]) => ({
    id, requirement_ids: reqIds,
  });

  it('should report all must-haves covered when every one has a question', () => {
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'nice')];
    const questions = [
      makeQuestion('q1', ['r1']),
      makeQuestion('q2', ['r2']),
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.allCovered).toBe(true);
    expect(result.uncovered_requirement_ids).toHaveLength(0);
  });

  it('should identify uncovered must-have requirements', () => {
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'must')];
    const questions = [
      makeQuestion('q1', ['r1']),
      // r2 and r3 have no questions
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.allCovered).toBe(false);
    expect(result.uncovered_requirement_ids).toContain('r2');
    expect(result.uncovered_requirement_ids).toContain('r3');
    expect(result.uncovered_requirement_ids).toHaveLength(2);
  });

  it('should NOT include nice-to-haves in uncovered list', () => {
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'nice')];
    const questions = [makeQuestion('q1', ['r1'])];

    const result = checkCoverage(requirements, questions);
    expect(result.allCovered).toBe(true);
    expect(result.uncovered_requirement_ids).not.toContain('r2');
  });

  it('should handle a question covering multiple requirements', () => {
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'must')];
    const questions = [
      makeQuestion('q1', ['r1', 'r2', 'r3']),
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.allCovered).toBe(true);
  });

  it('should handle empty questions', () => {
    const requirements = [makeReq('r1', 'must')];
    const result = checkCoverage(requirements, []);
    expect(result.allCovered).toBe(false);
    expect(result.uncovered_requirement_ids).toContain('r1');
  });

  it('should handle empty requirements', () => {
    const result = checkCoverage([], [makeQuestion('q1', ['r1'])]);
    expect(result.allCovered).toBe(true);
    expect(result.uncovered_requirement_ids).toHaveLength(0);
  });

  it('should report correct stats', () => {
    const requirements = [
      makeReq('r1', 'must'), makeReq('r2', 'must'),
      makeReq('r3', 'nice'), makeReq('r4', 'nice'),
    ];
    const questions = [
      makeQuestion('q1', ['r1']),
      makeQuestion('q2', ['r3']),
    ];

    const result = checkCoverage(requirements, questions);
    expect(result.stats.totalRequirements).toBe(4);
    expect(result.stats.mustHaveRequirements).toBe(2);
    expect(result.stats.niceRequirements).toBe(2);
    expect(result.stats.coveredMustHaves).toBe(1);
    expect(result.stats.coveredNiceToHaves).toBe(1);
  });

  it('getUncoveredRequirements should return full requirement objects', () => {
    const requirements = [makeReq('r1', 'must'), makeReq('r2', 'must'), makeReq('r3', 'nice')];
    const uncoveredIds = ['r2'];

    const uncovered = getUncoveredRequirements(requirements, uncoveredIds);
    expect(uncovered).toHaveLength(1);
    expect(uncovered[0].id).toBe('r2');
    expect(uncovered[0].priority).toBe('must');
  });
});
