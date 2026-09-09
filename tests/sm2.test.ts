import { describe, it, expect } from 'vitest';
import { calculateSM2 } from '../server/src/utils/sm2.js';

describe('SuperMemo-2 (SM-2) Spaced Repetition Algorithm', () => {
  it('should initialize new items with default parameters on first review', () => {
    const state = calculateSM2(4); // Quality = 4 (Easy)
    expect(state.repetitions).toBe(1);
    expect(state.interval).toBe(1);
    expect(state.easeFactor).toBeGreaterThanOrEqual(2.5);
    expect(state.nextReviewDate).toBeDefined();
  });

  it('should set interval to 6 days on second successful repetition', () => {
    const firstState = calculateSM2(4); // reps = 1, interval = 1
    const secondState = calculateSM2(4, firstState); // reps = 2, interval = 6
    expect(secondState.repetitions).toBe(2);
    expect(secondState.interval).toBe(6);
  });

  it('should multiply interval by ease factor on third and subsequent successful repetitions', () => {
    const first = calculateSM2(5); // reps = 1, interval = 1
    const second = calculateSM2(5, first); // reps = 2, interval = 6
    const third = calculateSM2(5, second); // reps = 3, interval = 6 * EF

    expect(third.repetitions).toBe(3);
    expect(third.interval).toBeGreaterThan(6);
  });

  it('should reset repetitions to 0 and interval to 1 day on quality rating < 3', () => {
    const initial = {
      repetitions: 5,
      interval: 30,
      easeFactor: 2.6,
      nextReviewDate: new Date().toISOString(),
    };

    const failedState = calculateSM2(1, initial); // Quality = 1 (Forgot)
    expect(failedState.repetitions).toBe(0);
    expect(failedState.interval).toBe(1);
  });

  it('should enforce minimum ease factor lower bound of 1.3', () => {
    let state = calculateSM2(1); // drops EF
    for (let i = 0; i < 10; i++) {
      state = calculateSM2(1, state);
    }
    expect(state.easeFactor).toBe(1.3);
  });

  it('should increase ease factor when quality rating is 5', () => {
    const initialEF = 2.5;
    const state = calculateSM2(5, { easeFactor: initialEF });
    expect(state.easeFactor).toBeGreaterThan(initialEF);
  });

  it('should clamp quality rating input between 1 and 5', () => {
    const low = calculateSM2(-5);
    expect(low.repetitions).toBe(0);

    const high = calculateSM2(10);
    expect(high.repetitions).toBe(1);
  });
});
