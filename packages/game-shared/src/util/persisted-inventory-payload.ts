import { playerConfig } from "../config/player-config";
import { FISTS_INVENTORY_SENTINEL } from "../constants/inventory-sentinel";
import { itemRegistry } from "../entities/item-registry";
import { resourceRegistry } from "../entities/resource-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import type { ItemState } from "../types/entity";
import { coerceSignMessage } from "./sign-message";
import {
  canItemGoInEquipmentSlot,
  createEmptyEquipment,
  EQUIPMENT_SLOT_KEYS,
  type EquipmentSlotKey,
  type InventoryItem,
  type PlayerEquipmentState,
} from "./inventory";

/** 1-based bag slot refs + which loadout row is active (mirrors Player serialized fields). */
export type PersistedWeaponBarState = {
  inputInventoryItem: number;
  weaponLoadoutPrimary: number;
  weaponLoadoutSecondary: number;
  weaponLoadoutMelee: number;
  activeWeaponLoadout: number;
  /** 1-based bag index for hotbar key 4 consumable; 0 = unset */
  loadoutConsumable4?: number;
  /** 1-based bag index for hotbar key 5 consumable; 0 = unset */
  loadoutConsumable5?: number;
};

export type PlayerInventoryPersistedPayload = {
  items: (InventoryItem | null)[];
  equipment: PlayerEquipmentState;
  weaponBar?: PersistedWeaponBarState;
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

function coerceEquipment(raw: unknown): PlayerEquipmentState {
  const base = createEmptyEquipment();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  for (const key of EQUIPMENT_SLOT_KEYS) {
    const slot = key as EquipmentSlotKey;
    const cell = coerceSingleItem(o[slot]);
    if (cell && canItemGoInEquipmentSlot(cell.itemType, slot)) {
      base[slot] = cell;
    }
  }
  return base;
}

function coerceWeaponBar(
  raw: unknown,
  maxSlots: number,
): PersistedWeaponBarState | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;

  const clampLoadoutIdx = (k: string): number => {
    const v = o[k];
    if (typeof v !== "number" || !Number.isFinite(v)) return 0;
    const n = Math.floor(v);
    if (n <= 0) return 0;
    return Math.min(maxSlots, n);
  };

  const lo = o.activeWeaponLoadout;
  const activeWeaponLoadout =
    typeof lo === "number" && Number.isFinite(lo) ? Math.max(0, Math.min(2, Math.floor(lo))) : 0;

  const invSel = o.inputInventoryItem;
  let inputInventoryItem = 1;
  if (invSel === FISTS_INVENTORY_SENTINEL) {
    inputInventoryItem = FISTS_INVENTORY_SENTINEL;
  } else if (typeof invSel === "number" && Number.isFinite(invSel)) {
    const n = Math.floor(invSel);
    if (n >= 1 && n <= maxSlots) inputInventoryItem = n;
  }

  let loadoutConsumable4 = 4;
  let loadoutConsumable5 = 5;
  if (Object.prototype.hasOwnProperty.call(o, "loadoutConsumable4")) {
    loadoutConsumable4 = clampLoadoutIdx("loadoutConsumable4");
  }
  if (Object.prototype.hasOwnProperty.call(o, "loadoutConsumable5")) {
    loadoutConsumable5 = clampLoadoutIdx("loadoutConsumable5");
  }

  return {
    inputInventoryItem,
    weaponLoadoutPrimary: clampLoadoutIdx("weaponLoadoutPrimary"),
    weaponLoadoutSecondary: clampLoadoutIdx("weaponLoadoutSecondary"),
    weaponLoadoutMelee: clampLoadoutIdx("weaponLoadoutMelee"),
    activeWeaponLoadout,
    loadoutConsumable4,
    loadoutConsumable5,
  };
}

/**
 * Validates and normalizes inventory JSON from DB or game-server disconnect (trusted path).
 * Returns null if `raw` is not an object with an `items` array.
 */
export function coercePlayerInventoryPersistedPayload(
  raw: unknown,
): PlayerInventoryPersistedPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.items)) return null;
  const maxSlots = playerConfig.MAX_INVENTORY_SLOTS;
  const items: (InventoryItem | null)[] = [];
  for (const cell of o.items) {
    if (cell === null || cell === undefined) {
      items.push(null);
      continue;
    }
    const it = coerceSingleItem(cell);
    items.push(it);
  }
  const slotCap = Math.max(maxSlots, items.length);
  const weaponBar =
    o.weaponBar !== undefined && o.weaponBar !== null
      ? coerceWeaponBar(o.weaponBar, slotCap)
      : undefined;

  const out: PlayerInventoryPersistedPayload = {
    items,
    equipment: coerceEquipment(o.equipment),
  };
  if (weaponBar !== undefined) {
    out.weaponBar = weaponBar;
  }
  return out;
}
