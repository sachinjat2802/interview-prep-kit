/**
 * @file uiUtils.ts
 * @description Frontend UI Utility Functions — Centralized helpers for category labels, difficulty badges, and formatting.
 * @module Client/Utils/UiUtils
 */

import { Question } from '../lib/types';

/**
 * Returns user-friendly category label text.
 * 
 * @param {Question['category']} category - Raw question category key.
 * @returns {string} Human readable category label.
 */
export function getCategoryLabel(category: Question['category'] | string): string {
  switch (category) {
    case 'technical':
      return 'Technical';
    case 'behavioural':
      return 'Behavioural';
    case 'system-design':
      return 'System Design';
    case 'company-fit':
      return 'Company & Culture';
    default:
      return category;
  }
}

/**
 * Returns Tailwind CSS class names for styling category pills/badges.
 * 
 * @param {Question['category']} category - Raw question category key.
 * @returns {string} Tailwind CSS class string.
 */
export function getCategoryBadgeStyle(category: Question['category'] | string): string {
  switch (category) {
    case 'technical':
      return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    case 'behavioural':
      return 'bg-purple-500/10 border-purple-500/30 text-purple-400';
    case 'system-design':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    case 'company-fit':
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    default:
      return 'bg-slate-800 border-slate-700 text-slate-300';
  }
}

/**
 * Returns Tailwind CSS class names for styling difficulty badges (1-3).
 * 
 * @param {number} difficulty - Difficulty rating (1: Easy, 2: Medium, 3: Hard).
 * @returns {string} Tailwind CSS class string.
 */
export function getDifficultyBadgeStyle(difficulty: number): string {
  switch (difficulty) {
    case 1:
      return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    case 2:
      return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    case 3:
      return 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    default:
      return 'bg-slate-800 border-slate-700 text-slate-300';
  }
}

/**
 * Formats a number of days (1 to 730 / 2 years) into a human readable timeline string.
 * 
 * @param {number} days - Number of days available (1-730).
 * @returns {string} Human readable label (e.g. "1 Day", "2 Weeks", "3 Months", "1 Year", "2 Years").
 */
export function formatDaysLabel(days: number): string {
  if (days <= 0) return '0 Days';
  if (days === 1) return '1 Day';
  if (days < 7) return `${days} Days`;
  if (days === 7) return '1 Week (7 Days)';
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} Week${weeks > 1 ? 's' : ''} (${days} Days)`;
  }
  if (days === 30) return '1 Month (30 Days)';
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} Month${months > 1 ? 's' : ''} (${days} Days)`;
  }
  if (days === 365) return '1 Year (365 Days)';
  if (days === 730) return '2 Years (730 Days)';

  const years = Math.floor(days / 365);
  const remMonths = Math.round((days % 365) / 30);
  if (remMonths === 0) return `${years} Year${years > 1 ? 's' : ''} (${days} Days)`;
  return `${years} Year${years > 1 ? 's' : ''} ${remMonths} Month${remMonths > 1 ? 's' : ''} (${days} Days)`;
}

