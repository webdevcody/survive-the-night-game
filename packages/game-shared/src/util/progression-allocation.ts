import type { CharacterAllocations } from "./character-stats";
import {
  CHARACTER_STAT_KEYS,
  MAX_POINTS_PER_CHARACTER_STAT,
  sumCharacterAllocations,
} from "./character-stats";
import type { AbilityAllocations } from "./ability-tree";
import {
  ABILITY_IDS,
  MAX_RANK_PER_ABILITY,
  sumAbilityAllocations,
} from "./ability-tree";
import { getProgressionPointsBudget } from "./experience-level";

export type AllocationValidationError =
  | { kind: "overspend_ability"; max: number; spent: number }
  | { kind: "overspend_character"; max: number; spent: number }
  | { kind: "invalid_ability_key"; key: string }
  | { kind: "invalid_character_key"; key: string }
  | { kind: "ability_rank_cap"; id: string; rank: number }
  | { kind: "character_stat_cap"; key: string; value: number };

export function normalizeAbilityAllocations(raw: unknown): AbilityAllocations {
  if (!raw || typeof raw !== "object") return {};
  const out: AbilityAllocations = {};
  for (const id of ABILITY_IDS) {
    const v = (raw as Record<string, unknown>)[id];
    if (typeof v === "number" && Number.isFinite(v)) {
      const n = Math.max(0, Math.min(MAX_RANK_PER_ABILITY, Math.floor(v)));
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

export function validateAbilityAllocations(
  allocations: AbilityAllocations,
  totalXp: number,
): AllocationValidationError | null {
  const max = getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
  for (const key of Object.keys(allocations)) {
    if (!ABILITY_IDS.includes(key as (typeof ABILITY_IDS)[number])) {
      return { kind: "invalid_ability_key", key };
    }
  }
  for (const id of ABILITY_IDS) {
    const r = allocations[id];
    if (r === undefined) continue;
    if (r < 0 || r > MAX_RANK_PER_ABILITY) {
      return { kind: "ability_rank_cap", id, rank: r };
    }
  }
  const spent = sumAbilityAllocations(allocations);
  if (spent > max) {
    return { kind: "overspend_ability", max, spent };
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

// One-release compatibility aliases while callers move to the ability naming.
export type SkillAllocations = AbilityAllocations;
export const normalizeSkillAllocations = normalizeAbilityAllocations;
export const validateSkillAllocations = validateAbilityAllocations;
