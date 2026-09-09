/**
 * @file coverage.ts
 * @description Deterministic Coverage Checker — Programmatically evaluates requirement coverage gaps against question requirement ID mappings.
 * @module Services/Pipeline/Coverage
 */

export interface CoverageRequirement {
  id: string;
  text: string;
  kind: string;
  priority: 'must' | 'nice';
}

export interface CoverageQuestion {
  id: string;
  requirement_ids: string[];
}

export interface CoverageResult {
  /** IDs of must-have requirements with no question covering them */
  uncovered_requirement_ids: string[];
  /** Whether all must-haves are covered */
  allCovered: boolean;
  /** Stats for reporting */
  stats: {
    totalRequirements: number;
    mustHaveRequirements: number;
    niceRequirements: number;
    coveredMustHaves: number;
    coveredNiceToHaves: number;
    totalQuestions: number;
  };
}

/**
 * Programmatically checks which must-have requirements lack coverage across generated questions.
 * 
 * @param {CoverageRequirement[]} requirements - Array of extracted requirements.
 * @param {CoverageQuestion[]} questions - Array of generated questions.
 * @returns {CoverageResult} Deterministic coverage analysis result including uncovered requirement IDs.
 */
export function checkCoverage(
  requirements: CoverageRequirement[],
  questions: CoverageQuestion[]
): CoverageResult {
  // Collect all requirement IDs covered by any question
  const coveredIds = new Set<string>();
  for (const question of questions) {
    if (Array.isArray(question.requirement_ids)) {
      for (const reqId of question.requirement_ids) {
        coveredIds.add(reqId);
      }
    }
  }

  const uncovered_requirement_ids: string[] = [];
  let mustHaveRequirements = 0;
  let niceRequirements = 0;
  let coveredMustHaves = 0;
  let coveredNiceToHaves = 0;

  for (const req of requirements) {
    const isCovered = coveredIds.has(req.id);
    if (req.priority === 'must') {
      mustHaveRequirements++;
      if (isCovered) {
        coveredMustHaves++;
      } else {
        uncovered_requirement_ids.push(req.id);
      }
    } else {
      niceRequirements++;
      if (isCovered) {
        coveredNiceToHaves++;
      }
    }
  }

  return {
    uncovered_requirement_ids,
    allCovered: uncovered_requirement_ids.length === 0,
    stats: {
      totalRequirements: requirements.length,
      mustHaveRequirements,
      niceRequirements,
      coveredMustHaves,
      coveredNiceToHaves,
      totalQuestions: questions.length,
    },
  };
}

/**
 * Get the full requirement objects for uncovered IDs.
 */
export function getUncoveredRequirements(
  requirements: CoverageRequirement[],
  uncoveredIds: string[]
): CoverageRequirement[] {
  if (!uncoveredIds || uncoveredIds.length === 0) return [];
  const idSet = new Set(uncoveredIds);
  return requirements.filter(req => idSet.has(req.id));
}
