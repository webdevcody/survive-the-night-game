/**
 * Total experience is stored as a non-negative integer (e.g. +1 per zombie kill).
 * Level 1 starts at 0 XP. Reaching level 2 requires 5 total XP (e.g. 5 kills at 1 XP each).
 *
 * XP required to advance from level L to L+1 while at level L:
 *   max(1, round(BASE * GROWTH^(L - 1)))
 * Tuned so L=1 → L=2 costs exactly BASE (5).
 *
 * Example cumulative XP to **enter** each level (see `buildLevelUpXpTable`):
 * L1: 0 → L2: 5 → L3: 12 → L4: 22 → L5: 35 → … (gap grows with GROWTH^L).
 */

export const XP_PER_ZOMBIE_KILL = 1;

const BASE_XP_TO_LEVEL_2 = 5;
const GROWTH = 1.4;

/** XP you must earn while at level `level` to reach `level + 1`. */
export function getXpToAdvanceFromLevel(level: number): number {
  if (level < 1 || !Number.isFinite(level)) {
    return BASE_XP_TO_LEVEL_2;
  }
  const L = Math.floor(level);
  return Math.max(1, Math.round(BASE_XP_TO_LEVEL_2 * Math.pow(GROWTH, L - 1)));
}

/**
 * Minimum total experience required to **be** at least `targetLevel` (1-indexed).
 * cumulativeXpToReachLevel(1) === 0, cumulativeXpToReachLevel(2) === 5, etc.
 */
export function cumulativeXpToReachLevel(targetLevel: number): number {
  if (targetLevel <= 1) {
    return 0;
  }
  let sum = 0;
  for (let L = 1; L < targetLevel; L++) {
    sum += getXpToAdvanceFromLevel(L);
  }
  return sum;
}

/** Build a breakdown chart: index 0 = level 1 row, etc. */
export function buildLevelUpXpTable(maxLevel: number): Array<{
  level: number;
  xpToNextLevel: number;
  cumulativeXpToReachThisLevel: number;
}> {
  const rows: Array<{
    level: number;
    xpToNextLevel: number;
    cumulativeXpToReachThisLevel: number;
  }> = [];
  for (let level = 1; level <= maxLevel; level++) {
    rows.push({
      level,
      xpToNextLevel: getXpToAdvanceFromLevel(level),
      cumulativeXpToReachThisLevel: cumulativeXpToReachLevel(level),
    });
  }
  return rows;
}

export function getLevelFromTotalExperience(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (remaining >= getXpToAdvanceFromLevel(level)) {
    remaining -= getXpToAdvanceFromLevel(level);
    level++;
  }
  return level;
}

export type ExperienceProgress = {
  level: number;
  /** XP earned toward the next level (0 <= currentXpInLevel < xpToNextLevel). */
  currentXpInLevel: number;
  /** XP required to advance from current level to the next. */
  xpToNextLevel: number;
  totalXp: number;
};

/**
 * Skill points and character stat points each use this budget: level 1 → 0, level 2 → 1, etc.
 */
export function getProgressionPointsBudget(totalXp: number): number {
  const level = getLevelFromTotalExperience(totalXp);
  return Math.max(0, level - 1);
}

export function getExperienceProgress(totalXp: number): ExperienceProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = xp;
  while (remaining >= getXpToAdvanceFromLevel(level)) {
    remaining -= getXpToAdvanceFromLevel(level);
    level++;
  }
  const xpToNextLevel = getXpToAdvanceFromLevel(level);
  return {
    level,
    currentXpInLevel: remaining,
    xpToNextLevel,
    totalXp: xp,
  };
}
