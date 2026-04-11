import { getProgressionPointsBudget } from "./experience-level";

export const ABILITY_IDS = ["sprint", "regenerate"] as const;
export type AbilityId = (typeof ABILITY_IDS)[number];

export function isAbilityId(value: string): value is AbilityId {
  return (ABILITY_IDS as readonly string[]).includes(value);
}

/** Max rank per ability node (single-rank unlocks for now). */
export const MAX_RANK_PER_ABILITY = 1;

export type AbilityAllocations = Partial<Record<AbilityId, number>>;

export function emptyAbilityAllocations(): Record<AbilityId, number> {
  return { sprint: 0, regenerate: 0 };
}

export function sumAbilityAllocations(allocations: AbilityAllocations): number {
  let total = 0;
  for (const id of ABILITY_IDS) {
    const value = allocations[id];
    if (typeof value === "number" && value > 0) {
      total += Math.floor(value);
    }
  }
  return total;
}

export function getMaxAbilityPointsFromTotalXp(totalXp: number): number {
  return getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
}

/** UI layout hints (canvas pixels relative to abilities panel content area). */
export const ABILITY_TREE_NODES: Array<{
  id: AbilityId;
  label: string;
  x: number;
  y: number;
}> = [
  { id: "sprint", label: "Sprint", x: 120, y: 80 },
  { id: "regenerate", label: "Regenerate", x: 120, y: 200 },
];

/** Future: prerequisite edges. Empty for initial two-node tree. */
export const ABILITY_TREE_EDGES: Array<{ from: AbilityId; to: AbilityId }> = [];

/** Heal per second while alive when regenerate rank >= 1 */
export const REGENERATE_HEAL_PER_SECOND = 0.35;

// One-release compatibility aliases while the rename lands across packages.
export const SKILL_IDS = ABILITY_IDS;
export type SkillId = AbilityId;
export const MAX_RANK_PER_SKILL = MAX_RANK_PER_ABILITY;
export type SkillAllocations = AbilityAllocations;
export const SKILL_TREE_NODES = ABILITY_TREE_NODES;
export const SKILL_TREE_EDGES = ABILITY_TREE_EDGES;
export const emptySkillAllocations = emptyAbilityAllocations;
export const sumSkillAllocations = sumAbilityAllocations;
export const getMaxSkillPointsFromTotalXp = getMaxAbilityPointsFromTotalXp;
export const isSkillId = isAbilityId;
