import type { ItemType } from "../../../util/inventory";
import { itemRegistry } from "../../../entities/item-registry";

// Helper functions for ItemType <-> uint16 conversion
// Uses item registry index, with 0 reserved for null/invalid
export function itemTypeToUInt16(itemType: ItemType | null): number {
  if (!itemType) return 0;
  const allIds = itemRegistry.getAllItemIds();
  const index = allIds.indexOf(itemType);
  // If not found, return 0 (invalid), otherwise index + 1 (to reserve 0 for null)
  return index >= 0 ? index + 1 : 0;
}

export function uint16ToItemType(value: number): ItemType | null {
  if (value === 0) return null;
  const allIds = itemRegistry.getAllItemIds();
  const index = value - 1;
  return index >= 0 && index < allIds.length ? allIds[index] : null;
}

