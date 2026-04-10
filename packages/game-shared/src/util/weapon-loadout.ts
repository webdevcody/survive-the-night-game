import { weaponRegistry, type WeaponLoadoutSlotKey } from "../entities/weapon-registry";

export type { WeaponLoadoutSlotKey };

export function weaponLoadoutSlotKeyToIndex(key: WeaponLoadoutSlotKey): 0 | 1 | 2 {
  if (key === "primary") return 0;
  if (key === "secondary") return 1;
  return 2;
}

export function getWeaponLoadoutSlotKey(itemType: string): WeaponLoadoutSlotKey | null {
  return weaponRegistry.get(itemType)?.loadoutSlot ?? null;
}

/** True if this item type belongs in the given loadout row (0 primary, 1 secondary, 2 melee). */
export function itemMatchesLoadoutRow(itemType: string, row: 0 | 1 | 2): boolean {
  const key = getWeaponLoadoutSlotKey(itemType);
  if (!key) return false;
  return weaponLoadoutSlotKeyToIndex(key) === row;
}

export function isRangedWeaponType(itemType: string): boolean {
  return weaponRegistry.get(itemType)?.type === "ranged";
}

export function isMeleeWeaponType(itemType: string): boolean {
  return weaponRegistry.get(itemType)?.type === "melee";
}
