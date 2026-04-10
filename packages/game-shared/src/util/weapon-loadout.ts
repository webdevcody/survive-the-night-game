import { weaponRegistry } from "../entities/weapon-registry";

export function isRangedWeaponType(itemType: string): boolean {
  return weaponRegistry.get(itemType)?.type === "ranged";
}

export function isMeleeWeaponType(itemType: string): boolean {
  return weaponRegistry.get(itemType)?.type === "melee";
}
