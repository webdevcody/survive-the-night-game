import { playerConfig } from "../config/player-config";
import type { AbilityAllocations, AbilityId } from "./ability-tree";

type InventoryUnlockAllocations = Pick<AbilityAllocations, "packRat" | "hercules">;
type DetectionAllocations = Pick<AbilityAllocations, "stealth" | "sneak">;

export const LOADOUT_RESERVED_BAG_SLOT_COUNT = 5;
export const BASE_UNLOCKED_VISIBLE_BAG_SLOTS = 5;
export const PACK_RAT_UNLOCKED_VISIBLE_BAG_SLOTS = 20;

export const ADRENALINE_HEALTH_THRESHOLD_FRACTION = 0.2;
export const ADRENALINE_SPEED_MULTIPLIER = 1.2;
export const STEALTH_ZOMBIE_DETECTION_MULTIPLIER = 0.65;
export const TRACK_STAR_MAX_STAMINA_BONUS = 10;
export const TRACK_STAR_STAMINA_REGEN_BONUS = 10;
export const TRACK_STAR_SPEED_MULTIPLIER = 1.08;
export const SNEAK_MOVE_SPEED_MULTIPLIER = 0.5;
export const BRAWLER_DAMAGE_BONUS = 1;
export const BRAWLER_KNOCKBACK_BONUS = 10;
export const HEAD_SHOT_CHANCE = 0.1;
export const HEAD_SHOT_BONUS_DAMAGE = 2;
export const AIM_FOR_THE_KNEE_CHANCE = 0.1;
export const AIM_FOR_THE_KNEE_DURATION_SECONDS = 5;
export const AIM_FOR_THE_KNEE_SPEED_MULTIPLIER = 0.5;
export const DETOX_MAX_DAMAGE_MULTIPLIER = 0.5;
export const COUNTER_ATTACK_CHANCE = 0.5;
export const COUNTER_ATTACK_DAMAGE = 2;
export const COMBAT_SHIELD_DAMAGE_REDUCTION = 1;
export const COMBAT_ROLL_DISTANCE = 48;
export const COMBAT_ROLL_COOLDOWN_SECONDS = 1.35;
export const COMBAT_ROLL_STEP_SIZE = 4;
export const COMBAT_ROLL_STAMINA_COST = 6;
export const LOCKED_CRATE_CHANCE = 0.35;

export function hasUnlockedAbility(
  allocations: AbilityAllocations | Record<string, number>,
  abilityId: AbilityId,
): boolean {
  return Number(allocations[abilityId] ?? 0) > 0;
}

export function getMaxVisibleBagSlots(totalInventorySlots: number): number {
  const total = Math.max(0, Math.floor(totalInventorySlots));
  return Math.max(0, total - LOADOUT_RESERVED_BAG_SLOT_COUNT);
}

export function getBaseUnlockedVisibleBagSlots(allocations: InventoryUnlockAllocations): number {
  if (hasUnlockedAbility(allocations, "hercules")) {
    return playerConfig.MAX_INVENTORY_SLOTS - LOADOUT_RESERVED_BAG_SLOT_COUNT;
  }
  if (hasUnlockedAbility(allocations, "packRat")) {
    return PACK_RAT_UNLOCKED_VISIBLE_BAG_SLOTS;
  }
  return BASE_UNLOCKED_VISIBLE_BAG_SLOTS;
}

export function getUnlockedVisibleBagSlots(
  totalInventorySlots: number,
  allocations: InventoryUnlockAllocations,
): number {
  const maxVisibleSlots = getMaxVisibleBagSlots(totalInventorySlots);
  const strengthBonusSlots = Math.max(0, Math.floor(totalInventorySlots) - playerConfig.MAX_INVENTORY_SLOTS);
  return Math.min(maxVisibleSlots, getBaseUnlockedVisibleBagSlots(allocations) + strengthBonusSlots);
}

export function getAccessibleInventorySlotCount(
  totalInventorySlots: number,
  allocations: InventoryUnlockAllocations,
): number {
  const total = Math.max(0, Math.floor(totalInventorySlots));
  return Math.min(
    total,
    getUnlockedVisibleBagSlots(totalInventorySlots, allocations) + LOADOUT_RESERVED_BAG_SLOT_COUNT,
  );
}

export function isBagSlotLocked(
  bagIndex0: number,
  totalInventorySlots: number,
  allocations: InventoryUnlockAllocations,
): boolean {
  if (!Number.isFinite(bagIndex0) || bagIndex0 < 0) {
    return true;
  }
  return bagIndex0 >= getAccessibleInventorySlotCount(totalInventorySlots, allocations);
}

export function isAdrenalineActive(currentHealth: number, maxHealth: number): boolean {
  if (!Number.isFinite(currentHealth) || !Number.isFinite(maxHealth) || maxHealth <= 0) {
    return false;
  }
  return currentHealth > 0 && currentHealth / maxHealth <= ADRENALINE_HEALTH_THRESHOLD_FRACTION;
}

export function getZombieDetectionRadiusMultiplier(
  allocations: DetectionAllocations,
  isSneaking: boolean,
): number {
  if (isSneaking && hasUnlockedAbility(allocations, "sneak")) {
    return 0;
  }
  return hasUnlockedAbility(allocations, "stealth") ? STEALTH_ZOMBIE_DETECTION_MULTIPLIER : 1;
}
