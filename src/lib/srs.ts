import { ReviewGrade, WordStatus } from '../types';

// Days until next review at each srs_level. Level 0 is "just missed it".
export const INTERVALS_DAYS = [0, 1, 3, 7, 14, 30, 60, 120];
const KNOWN_FROM_LEVEL = 4;
const AGAIN_DELAY_HOURS = 4;

export interface SrsResult {
  srsLevel: number;
  status: WordStatus;
  nextReviewAt: number;
}

export function applyGrade(currentLevel: number, grade: ReviewGrade): SrsResult {
  const now = Date.now();

  if (grade === 'again') {
    return {
      srsLevel: 0,
      status: 'learning',
      nextReviewAt: now + AGAIN_DELAY_HOURS * 60 * 60 * 1000,
    };
  }

  const nextLevel =
    grade === 'hard' ? Math.max(1, currentLevel) : Math.min(currentLevel + 1, INTERVALS_DAYS.length - 1);

  const days = INTERVALS_DAYS[nextLevel];
  return {
    srsLevel: nextLevel,
    status: nextLevel >= KNOWN_FROM_LEVEL ? 'known' : 'learning',
    nextReviewAt: now + days * 24 * 60 * 60 * 1000,
  };
}
