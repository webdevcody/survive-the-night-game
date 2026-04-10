import { itemRegistry, type ItemConfig } from "../entities/item-registry";
import type { EquipmentSlotKey, InventoryItem, PlayerEquipmentState } from "./inventory";

/**
 * Body overlay paint order (earlier = drawn behind). Head last so hats sit on top.
 * Independent of EQUIPMENT_SLOT_KEYS network order.
 */
export const PLAYER_BODY_OVERLAY_SLOT_ORDER: readonly EquipmentSlotKey[] = [
  "shoes",
  "legs",
  "torso",
  "shoulders",
  "back",
  "hands",
  "head",
] as const;

export function itemRendersOnPlayerBody(cfg: ItemConfig | undefined): boolean {
  if (!cfg) return false;
  if (cfg.rendersOnPlayerOverlay === false) return false;
  if (cfg.rendersOnPlayerOverlay === true) return true;
  return cfg.wearable === true && cfg.equipmentSlot !== undefined;
}

export function getPlayerBodyOverlayItemsInRenderOrder(
  equipment: PlayerEquipmentState
): InventoryItem[] {
  const out: InventoryItem[] = [];
  for (const slot of PLAYER_BODY_OVERLAY_SLOT_ORDER) {
    const item = equipment[slot];
    if (!item) continue;
    if (itemRendersOnPlayerBody(itemRegistry.get(item.itemType))) {
      out.push(item);
    }
  }
  return out;
}
