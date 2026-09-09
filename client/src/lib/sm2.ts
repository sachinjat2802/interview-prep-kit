/**
 * @file sm2.ts
 * @description Client-side SuperMemo-2 (SM-2) Spaced Repetition Algorithm Implementation.
 * Computes memory ease factor, repetition counts, and next review interval in days.
 * @module Lib/SM2
 */

export interface SM2State {
  repetitions: number;
  interval: number;
  easeFactor: number;
  nextReviewDate: string;
}

/**
 * Calculates updated SuperMemo-2 spaced repetition state based on quality rating (1-5).
 * 
 * @param quality User memory retention rating (1 = Forgot, 2 = Hard, 3 = Good, 4 = Easy, 5 = Perfect)
 * @param currentState Existing SM-2 state or undefined for new items
 * @returns Updated SM2State with next review date timestamp
 */
export function calculateSM2(quality: number, currentState?: Partial<SM2State>): SM2State {
  const q = Math.max(1, Math.min(5, Math.round(quality)));

  const repetitions = currentState?.repetitions ?? 0;
  const interval = currentState?.interval ?? 1;
  const easeFactor = currentState?.easeFactor ?? 2.5;

  let newEf = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEf < 1.3) newEf = 1.3;
  newEf = Math.round(newEf * 100) / 100;

  let newRepetitions = 0;
  let newInterval = 1;

  if (q < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEf);
    }
    newRepetitions = repetitions + 1;
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: newEf,
    nextReviewDate: nextDate.toISOString(),
  };
}
