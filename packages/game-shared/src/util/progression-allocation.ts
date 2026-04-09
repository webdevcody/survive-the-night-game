import type { CharacterAllocations } from "./character-stats";
import {
  CHARACTER_STAT_KEYS,
  MAX_POINTS_PER_CHARACTER_STAT,
  sumCharacterAllocations,
} from "./character-stats";
import type { SkillAllocations } from "./skill-tree";
import { MAX_RANK_PER_SKILL, SKILL_IDS, sumSkillAllocations } from "./skill-tree";
import { getProgressionPointsBudget } from "./experience-level";

export type AllocationValidationError =
  | { kind: "overspend_skill"; max: number; spent: number }
  | { kind: "overspend_character"; max: number; spent: number }
  | { kind: "invalid_skill_key"; key: string }
  | { kind: "invalid_character_key"; key: string }
  | { kind: "skill_rank_cap"; id: string; rank: number }
  | { kind: "character_stat_cap"; key: string; value: number };

export function normalizeSkillAllocations(raw: unknown): SkillAllocations {
  if (!raw || typeof raw !== "object") return {};
  const out: SkillAllocations = {};
  for (const id of SKILL_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.max(0, Math.min(MAX_RANK_PER_SKILL, Math.floor(v)));
      if (n > 0) out[id] = n;
    }
  }
  return out;
}

export function normalizeCharacterAllocations(raw: unknown): CharacterAllocations {
  if (!raw || typeof raw !== "object") return {};
  const src = raw as Record<string, unknown>;
  const out: CharacterAllocations = {};
  for (const key of CHARACTER_STAT_KEYS) {
    let v = src[key];
    if (key === "evade" && v === undefined && typeof src.defence === "number") {
      v = src.defence;
    }
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.max(0, Math.min(MAX_POINTS_PER_CHARACTER_STAT, Math.floor(v)));
      if (n > 0) out[key] = n;
    }
  }
  return out;
}

export function validateSkillAllocations(
  allocations: SkillAllocations,
  totalXp: number,
): AllocationValidationError | null {
  const max = getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
  for (const key of Object.keys(allocations)) {
    if (!SKILL_IDS.includes(key as (typeof SKILL_IDS)[number])) {
      return { kind: "invalid_skill_key", key };
    }
  }
  for (const id of SKILL_IDS) {
    const r = allocations[id];
    if (r === undefined) continue;
    if (r < 0 || r > MAX_RANK_PER_SKILL) {
      return { kind: "skill_rank_cap", id, rank: r };
    }
  }
  const spent = sumSkillAllocations(allocations);
  if (spent > max) {
    return { kind: "overspend_skill", max, spent };
  }
  return null;
}

export function validateCharacterAllocations(
  allocations: CharacterAllocations,
  totalXp: number,
): AllocationValidationError | null {
  const max = getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
  for (const key of Object.keys(allocations)) {
    if (!CHARACTER_STAT_KEYS.includes(key as (typeof CHARACTER_STAT_KEYS)[number])) {
      return { kind: "invalid_character_key", key };
    }
  }
  for (const key of CHARACTER_STAT_KEYS) {
    const v = allocations[key];
    if (v === undefined) continue;
    if (v < 0 || v > MAX_POINTS_PER_CHARACTER_STAT) {
      return { kind: "character_stat_cap", key, value: v };
    }
  }
  const spent = sumCharacterAllocations(allocations);
  if (spent > max) {
    return { kind: "overspend_character", max, spent };
  }
  return null;
}
