import { getProgressionPointsBudget } from "./experience-level";

export const SKILL_IDS = ["sprint", "regenerate"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export function isSkillId(s: string): s is SkillId {
  return (SKILL_IDS as readonly string[]).includes(s);
}

/** Max rank per skill node (single-rank unlocks for now). */
export const MAX_RANK_PER_SKILL = 1;

export type SkillAllocations = Partial<Record<SkillId, number>>;

export function emptySkillAllocations(): Record<SkillId, number> {
  return { sprint: 0, regenerate: 0 };
}

export function sumSkillAllocations(a: SkillAllocations): number {
  let s = 0;
  for (const id of SKILL_IDS) {
    const v = a[id];
    if (typeof v === "number" && v > 0) s += Math.floor(v);
  }
  return s;
}

export function getMaxSkillPointsFromTotalXp(totalXp: number): number {
  return getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
}

/** UI layout hints (canvas pixels relative to skills panel content area). */
export const SKILL_TREE_NODES: Array<{
  id: SkillId;
  label: string;
  x: number;
  y: number;
}> = [
  { id: "sprint", label: "Sprint", x: 120, y: 80 },
  { id: "regenerate", label: "Regenerate", x: 120, y: 200 },
];

/** Future: prerequisite edges. Empty for initial two-node tree. */
export const SKILL_TREE_EDGES: Array<{ from: SkillId; to: SkillId }> = [];

/** Heal per second while alive when regenerate rank >= 1 */
export const REGENERATE_HEAL_PER_SECOND = 0.35;
