import { playerConfig } from "../config/player-config";
import { itemRegistry } from "../entities/item-registry";
import { resourceRegistry } from "../entities/resource-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import type { ItemState } from "../types/entity";
import type { InventoryItem } from "./inventory";
import { coerceSignMessage } from "./sign-message";

export type PlayerBankPersistedPayload = {
  items: (InventoryItem | null)[];
};

function isKnownItemType(itemType: string): boolean {
  return (
    itemRegistry.has(itemType) || weaponRegistry.has(itemType) || resourceRegistry.has(itemType)
  );
}

function coerceItemState(raw: unknown): ItemState | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: ItemState = {};
  if (typeof o.count === "number" && Number.isFinite(o.count)) {
    out.count = Math.max(0, Math.floor(o.count));
  }
  if (typeof o.health === "number" && Number.isFinite(o.health)) {
    out.health = Math.max(0, o.health);
  }
  const message = coerceSignMessage(o.message);
  if (message) {
    out.message = message;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function coerceSingleItem(raw: unknown): InventoryItem | null {
  if (raw === null) return null;
  if (!raw || typeof raw !== "object") return null;
  const itemType = (raw as InventoryItem).itemType;
  if (typeof itemType !== "string" || !isKnownItemType(itemType)) return null;
  const state = coerceItemState((raw as InventoryItem).state);
  return state !== undefined ? { itemType, state } : { itemType };
}

/**
 * Validates bank JSON from DB / disconnect (trusted path).
 */
export function coercePlayerBankPersistedPayload(raw: unknown): PlayerBankPersistedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  const maxSlots = playerConfig.MAX_BANK_SLOTS;
  const items: (InventoryItem | null)[] = [];
  for (const cell of o.items) {
    if (cell === null || cell === undefined) {
      items.push(null);
      continue;
    }
    items.push(coerceSingleItem(cell));
  }
  while (items.length < maxSlots) items.push(null);
  return { items: items.slice(0, maxSlots) };
}
