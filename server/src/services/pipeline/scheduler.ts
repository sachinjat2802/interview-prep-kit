/**
 * @file scheduler.ts
 * @description Deterministic Study Schedule Allocator — Distributes interview prep material into integer minute daily budgets without LLM intervention.
 * @module Services/Pipeline/Scheduler
 */

export interface ScheduleQuestion {
  id: string;
  requirement_ids: string[];
  category: string;
  difficulty: number;
}

export interface ScheduleRequirement {
  id: string;
  priority: 'must' | 'nice';
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

// Minutes estimate per difficulty level
const MINUTES_BY_DIFFICULTY: Record<number, number> = {
  1: 15, // Easy — quick review
  2: 25, // Medium — practice and review
  3: 40, // Hard — deep study and practice
};

// Priority weights for scoring
const PRIORITY_WEIGHT: Record<string, number> = {
  must: 3,
  nice: 1,
};

/**
 * Builds a deterministic study schedule distributing questions across the requested number of days.
 * 
 * Algorithm:
 * 1. Scores each question by difficulty x priority weight (must-haves scheduled earlier).
 * 2. Sorts questions by score descending.
 * 3. Allocates integer minute time budgets per day based on workload ratios.
 * 4. Ensures 100% of must-have requirements are scheduled.
 * 
 * @param {ScheduleQuestion[]} questions - Array of questions to schedule.
 * @param {ScheduleRequirement[]} requirements - Array of extracted requirements.
 * @param {number} daysAvailable - Requested prep timeline in days.
 * @returns {Schedule} Complete Appendix A compliant schedule object.
 */
export function buildSchedule(
  questions: ScheduleQuestion[],
  requirements: ScheduleRequirement[],
  daysAvailable: number
): Schedule {
  // Handle edge cases
  if (daysAvailable < 1) daysAvailable = 1;
  if (questions.length === 0) {
    return {
      days_available: daysAvailable,
      days: Array.from({ length: daysAvailable }, (_, dayIndex) => ({
        day: dayIndex + 1,
        focus: 'Review',
        question_ids: [],
        minutes: 0,
      })),
    };
  }

  // Build a map of requirement ID → priority
  const requirementPriorityMap = new Map<string, string>();
  for (const requirement of requirements) {
    requirementPriorityMap.set(requirement.id, requirement.priority);
  }

  // Score each question and compute total minutes in a single pass
  let totalMinutes = 0;
  const scoredQuestions = questions.map(question => {
    let maxPriorityWeight = 1;
    for (const reqId of question.requirement_ids) {
      const priority = requirementPriorityMap.get(reqId) || 'nice';
      maxPriorityWeight = Math.max(maxPriorityWeight, PRIORITY_WEIGHT[priority] || 1);
    }
    const score = maxPriorityWeight * question.difficulty;
    const minutes = MINUTES_BY_DIFFICULTY[question.difficulty] || 25;
    totalMinutes += minutes;
    return { ...question, score, minutes };
  });

  // Sort by score descending (hardest/highest-priority first)
  scoredQuestions.sort((questionA, questionB) => questionB.score - questionA.score);

  const targetMinutesPerDay = Math.ceil(totalMinutes / daysAvailable);

  // Greedily assign questions to days
  const dayBuckets: Array<{ questions: typeof scoredQuestions; totalMinutes: number }> = 
    Array.from({ length: daysAvailable }, () => ({ questions: [], totalMinutes: 0 }));

  let currentDay = 0;
  for (const question of scoredQuestions) {
    // Move to next day if current is full (but don't exceed available days)
    if (dayBuckets[currentDay].totalMinutes >= targetMinutesPerDay && 
        currentDay < daysAvailable - 1) {
      currentDay++;
    }
    
    dayBuckets[currentDay].questions.push(question);
    dayBuckets[currentDay].totalMinutes += question.minutes;
  }

  // Build schedule days with focus labels in a single pass per day
  const days: ScheduleDay[] = dayBuckets.map((bucket, dayIndex) => {
    const qCount = bucket.questions.length;
    if (qCount === 0) {
      return {
        day: dayIndex + 1,
        focus: 'Review',
        question_ids: [],
        minutes: 0,
      };
    }

    const categoryCounts: Record<string, number> = {};
    const questionIds: string[] = new Array(qCount);
    let diffSum = 0;

    for (let i = 0; i < qCount; i++) {
      const q = bucket.questions[i];
      questionIds[i] = q.id;
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
      diffSum += q.difficulty;
    }

    let focus = 'Review';
    let maxCount = 0;
    for (const category in categoryCounts) {
      if (categoryCounts[category] > maxCount) {
        maxCount = categoryCounts[category];
        focus = formatCategoryFocus(category);
      }
    }

    const avgDifficulty = diffSum / qCount;
    if (avgDifficulty >= 2.5) {
      focus = `Deep ${focus}`;
    } else if (avgDifficulty <= 1.5) {
      focus = `${focus} Fundamentals`;
    }

    return {
      day: dayIndex + 1,
      focus,
      question_ids: questionIds,
      minutes: Math.round(bucket.totalMinutes), // Ensure integer
    };
  });

  // Post-processing: enforce minimum 15 minutes for any day with questions
  for (const day of days) {
    if (day.question_ids.length > 0 && day.minutes < 15) {
      day.minutes = 15;
    }
  }

  return {
    days_available: daysAvailable,
    days,
  };
}

function formatCategoryFocus(category: string): string {
  const categoryMap: Record<string, string> = {
    'technical': 'Technical Skills',
    'behavioural': 'Behavioural Prep',
    'system-design': 'System Design',
    'company-fit': 'Company & Culture',
  };
  return categoryMap[category] || 'General Prep';
}

/**
 * Verify that every must-have requirement appears in the schedule.
 * Returns IDs of must-have requirements not in any scheduled question.
 */
export function findUnscheduledMustHaves(
  schedule: Schedule,
  questions: ScheduleQuestion[],
  requirements: ScheduleRequirement[]
): string[] {
  const mustHaveIds = new Set<string>();
  for (const req of requirements) {
    if (req.priority === 'must') {
      mustHaveIds.add(req.id);
    }
  }

  // Collect all question IDs in the schedule without flatMap allocation
  const scheduledQuestionIds = new Set<string>();
  for (const dayItem of schedule.days) {
    for (const qId of dayItem.question_ids) {
      scheduledQuestionIds.add(qId);
    }
  }

  // Find which requirement IDs are covered by scheduled questions
  const coveredReqIds = new Set<string>();
  for (const question of questions) {
    if (scheduledQuestionIds.has(question.id)) {
      for (const reqId of question.requirement_ids) {
        coveredReqIds.add(reqId);
      }
    }
  }

  const unscheduled: string[] = [];
  for (const id of mustHaveIds) {
    if (!coveredReqIds.has(id)) {
      unscheduled.push(id);
    }
  }
  return unscheduled;
}
