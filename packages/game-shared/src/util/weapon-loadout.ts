import { weaponRegistry, type WeaponLoadoutSlotKey } from "../entities/weapon-registry";
import type { InventoryItem } from "./inventory";

export type { WeaponLoadoutSlotKey };

/** Bag index and item for the weapon in the active loadout row, or null if fists / invalid. */
export type ResolvedLoadoutWeapon = { item: InventoryItem; bagIndex1Based: number };

/**
 * Same rules as server Player.resolveAttackWeaponItem (weapon path only).
 * Used by client held sprite, crosshair, and server combat resolution.
 */
export function resolveAttackWeaponFromLoadout(
  inventory: (InventoryItem | null)[],
  maxSlots: number,
  activeWeaponLoadout: number,
  weaponLoadoutPrimary: number,
  weaponLoadoutSecondary: number,
  weaponLoadoutMelee: number
): ResolvedLoadoutWeapon | null {
  const at = (idx: number): InventoryItem | null =>
    idx >= 1 && idx <= maxSlots ? inventory[idx - 1] ?? null : null;

  const lo = Math.floor(activeWeaponLoadout);

  if (lo === 0) {
    const idx = weaponLoadoutPrimary;
    if (idx < 1) return null;
    const item = at(idx);
    if (!item || !itemMatchesLoadoutRow(item.itemType, 0)) return null;
    return { item, bagIndex1Based: idx };
  }
  if (lo === 1) {
    const idx = weaponLoadoutSecondary;
    if (idx < 1) return null;
    const item = at(idx);
    if (!item || !itemMatchesLoadoutRow(item.itemType, 1)) return null;
    return { item, bagIndex1Based: idx };
  }
  if (lo === 2) {
    const idx = weaponLoadoutMelee;
    if (idx < 1) return null;
    const item = at(idx);
    if (!item || !itemMatchesLoadoutRow(item.itemType, 2)) return null;
    return { item, bagIndex1Based: idx };
  }
  return null;
}

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
