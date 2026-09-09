/**
 * @file paramUtils.ts
 * @description Parameter Utility Functions — Reusable helpers for parsing and normalizing route parameters.
 * @module Utils/ParamUtils
 */

/**
 * Safely extracts and normalizes Express route parameter strings.
 * Handles string | string[] | undefined types seamlessly.
 * 
 * @param {string | string[] | undefined} param - Express route parameter.
 * @returns {string} Normalized string parameter.
 */
export function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}
