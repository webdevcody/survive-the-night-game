import { getProgressionPointsBudget } from "./experience-level";
import { itemRegistry } from "../entities/item-registry";
import { EQUIPMENT_SLOT_KEYS, type InventoryItem, type PlayerEquipmentState } from "./inventory";

/** Allocatable character stat keys (persisted / serialized). */
export const CHARACTER_STAT_KEYS = [
  "health",
  "evade",
  "accuracy",
  "reloadSpeed",
  "runSpeed",
  "luck",
  "stamina",
  "recovery",
  "hpRecovery",
  "strength",
] as const;

export type CharacterStatKey = (typeof CHARACTER_STAT_KEYS)[number];

export function isCharacterStatKey(k: string): k is CharacterStatKey {
  return (CHARACTER_STAT_KEYS as readonly string[]).includes(k);
}

/** Max points per stat (optional cap). */
export const MAX_POINTS_PER_CHARACTER_STAT = 99;

/** Tuning: per allocated point effect (server applies these). */
export const CHARACTER_STAT_MODIFIERS = {
  /** +max HP per point */
  healthPerPoint: 1,
  /** Max evade chance vs zombie hits (hard cap) */
  evadeMaxChance: 0.65,
  /** Evade chance per point (before cap): evadeChance = min(cap, points * this) */
  evadeChancePerPoint: 0.007,
  /** Spread angle multiplier per point (lower = more accurate): spread *= max(0.2, 1 - accuracy * this) */
  accuracySpreadReductionPerPoint: 0.06,
  /** Cooldown multiplier per point: cooldown *= max(0.5, 1 - reloadSpeed * this) */
  reloadSpeedCooldownReductionPerPoint: 0.05,
  /** Move speed multiplier per point */
  runSpeedPerPoint: 0.03,
  /** Luck: weight boost toward rarer drops (0–1 scale per point, capped in apply) */
  luckRareBiasPerPoint: 0.04,
  /** +max stamina per point */
  staminaMaxPerPoint: 2,
  /** Multiplier per recovery point: regen *= (1 + points * this) */
  staminaRecoveryPerPoint: 0.05,
  /** Base seconds between passive HP heals (before hpRecovery stat) */
  passiveHpRegenBaseIntervalSec: 8,
  /** Minimum interval between passive heals (seconds) */
  passiveHpRegenMinIntervalSec: 2,
  /** Seconds removed from interval per hpRecovery point */
  passiveHpRegenIntervalReductionPerPoint: 0.12,
  /** HP healed each passive tick */
  passiveHpRegenAmount: 0.25,
  /** Extra inventory slots per strength point */
  strengthSlotsPerPoint: 1,
  /** Extra stamina drain multiplier per kg carried while sprinting: drain *= (1 + weight * this) */
  encumbranceStaminaDrainPerKg: 0.12,
} as const;

export type CharacterAllocations = Partial<Record<CharacterStatKey, number>>;

export function emptyCharacterAllocations(): Record<CharacterStatKey, number> {
  return {
    health: 0,
    evade: 0,
    accuracy: 0,
    reloadSpeed: 0,
    runSpeed: 0,
    luck: 0,
    stamina: 0,
    recovery: 0,
    hpRecovery: 0,
    strength: 0,
  };
}

export function sumCharacterAllocations(a: CharacterAllocations): number {
  let s = 0;
  for (const k of CHARACTER_STAT_KEYS) {
    const v = a[k];
    if (typeof v === "number" && v > 0) s += Math.floor(v);
  }
  return s;
}

/** Points available from leveling: level 1 → 0, level 2 → 1, etc. */
export function getMaxCharacterPointsFromTotalXp(totalXp: number): number {
  return getProgressionPointsBudget(Math.max(0, Math.floor(totalXp)));
}

// --- Derived stat helpers (base config values passed from server) ---

export function computeMaxPlayerHealth(baseMax: number, healthPoints: number): number {
  const p = Math.max(0, Math.floor(healthPoints));
  return baseMax + p * CHARACTER_STAT_MODIFIERS.healthPerPoint;
}

export function computeEvadeChance(evadePoints: number): number {
  const p = Math.max(0, Math.floor(evadePoints));
  return Math.min(
    CHARACTER_STAT_MODIFIERS.evadeMaxChance,
    p * CHARACTER_STAT_MODIFIERS.evadeChancePerPoint,
  );
}

export function computeMaxStamina(baseMax: number, staminaStatPoints: number): number {
  const p = Math.max(0, Math.floor(staminaStatPoints));
  return baseMax + p * CHARACTER_STAT_MODIFIERS.staminaMaxPerPoint;
}

export function computeStaminaRegenMultiplier(recoveryPoints: number): number {
  const p = Math.max(0, Math.floor(recoveryPoints));
  return 1 + p * CHARACTER_STAT_MODIFIERS.staminaRecoveryPerPoint;
}

export function computePassiveHpRegenIntervalSeconds(hpRecoveryPoints: number): number {
  const p = Math.max(0, Math.floor(hpRecoveryPoints));
  const raw =
    CHARACTER_STAT_MODIFIERS.passiveHpRegenBaseIntervalSec -
    p * CHARACTER_STAT_MODIFIERS.passiveHpRegenIntervalReductionPerPoint;
  return Math.max(CHARACTER_STAT_MODIFIERS.passiveHpRegenMinIntervalSec, raw);
}

export function computeMaxInventorySlots(baseSlots: number, strengthPoints: number): number {
  const p = Math.max(0, Math.floor(strengthPoints));
  return baseSlots + p * CHARACTER_STAT_MODIFIERS.strengthSlotsPerPoint;
}

export function getItemWeightKg(itemType: string): number {
  const cfg = itemRegistry.get(itemType);
  const w = cfg?.weightKg;
  if (typeof w === "number" && Number.isFinite(w) && w >= 0) {
    return w;
  }
  return 0.1;
}

/**
 * Total carried weight (kg): bag slots + equipment. Stack counts multiply weight.
 */
export function computeInventoryWeightKg(
  items: (InventoryItem | null)[],
  equipment: PlayerEquipmentState,
): number {
  let total = 0;
  for (const it of items) {
    if (!it) continue;
    const n = it.state?.count ?? 1;
    total += getItemWeightKg(it.itemType) * n;
  }
  for (const key of EQUIPMENT_SLOT_KEYS) {
    const slot = equipment[key];
    if (!slot) continue;
    const n = slot.state?.count ?? 1;
    total += getItemWeightKg(slot.itemType) * n;
  }
  return total;
}

export function computeEncumbranceStaminaDrainMultiplier(totalWeightKg: number): number {
  const w = Math.max(0, totalWeightKg);
  return 1 + w * CHARACTER_STAT_MODIFIERS.encumbranceStaminaDrainPerKg;
}
