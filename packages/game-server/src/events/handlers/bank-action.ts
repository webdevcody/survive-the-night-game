import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import type { BankActionEventData } from "@shared/events/client-sent/events/bank-action";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import Bank from "@/extensions/bank";
import Consumable from "@/extensions/consumable";
import Carryable from "@/extensions/carryable";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";
import { Entities } from "@shared/constants";
import {
  canItemGoInEquipmentSlot,
  decodeEquipmentSlotKey,
  type EquipmentSlotKey,
  type InventoryItem,
} from "@shared/util/inventory";
import { itemMatchesConsumableLoadout } from "@shared/util/consumable-loadout";
import { itemMatchesLoadoutRow } from "@shared/util/weapon-loadout";
import { itemRegistry } from "@shared/entities/item-registry";
import { Direction } from "@shared/util/direction";
import PoolManager from "@shared/util/pool-manager";
import { PlayerDroppedItemEvent } from "@shared/events/server-sent/events/player-dropped-item-event";
import { Player } from "@/entities/players/player";

function isStackableItem(item: InventoryItem): boolean {
  if (item.state && typeof item.state.count === "number") {
    return true;
  }
  const itemConfig = itemRegistry.get(item.itemType);
  return itemConfig?.category === "ammo";
}

function validateBankPayload(data: unknown): BankActionEventData | null {
  if (!data || typeof data !== "object") {
    return null;
  }
  const o = data as Record<string, unknown>;
  const lockerEntityId = o.lockerEntityId;
  const action = o.action;
  const source = o.source;
  const slotIndex = o.slotIndex;
  const equipSlotIndex = o.equipSlotIndex;
  if (
    typeof lockerEntityId !== "number" ||
    !Number.isInteger(lockerEntityId) ||
    lockerEntityId < 0 ||
    typeof action !== "number" ||
    typeof source !== "number" ||
    typeof slotIndex !== "number" ||
    typeof equipSlotIndex !== "number"
  ) {
    return null;
  }
  if (action < 0 || action > 4 || source < 0 || source > 2) {
    return null;
  }
  if (slotIndex < 0 || slotIndex > 254 || equipSlotIndex < 0 || equipSlotIndex > 255) {
    return null;
  }
  return {
    lockerEntityId,
    action: action as BankActionEventData["action"],
    source: source as BankActionEventData["source"],
    slotIndex,
    equipSlotIndex,
  };
}

function assertLockerInRange(player: Player, lockerEntityId: number): boolean {
  const stationEntity = player.getEntityManager().getEntityById(lockerEntityId);
  if (!stationEntity || !stationEntity.hasExt(Positionable)) {
    return false;
  }
  if (stationEntity.getType() !== Entities.LOCKER) {
    return false;
  }
  return (
    distance(
      player.getCenterPosition(),
      stationEntity.getExt(Positionable).getCenterPosition(),
    ) <= getConfig().player.MAX_INTERACT_RADIUS
  );
}

function firstEmptyBagIndex(inv: Inventory): number | null {
  const max = inv.getMaxSlots();
  const items = inv.getItems();
  for (let i = 0; i < max; i++) {
    if (items[i] == null) {
      return i;
    }
  }
  return null;
}

function firstEmptyBankIndex(bank: Bank): number | null {
  const items = bank.getItems();
  for (let i = 0; i < items.length; i++) {
    if (items[i] == null) {
      return i;
    }
  }
  return null;
}

export function dropItemNearPlayerFacing(player: Player, itemToDrop: InventoryItem): void {
  const entityManager = player.getEntityManager();
  const droppedEntity = entityManager.createEntityFromItem(itemToDrop);
  if (!droppedEntity) {
    return;
  }
  const carryable = droppedEntity.getExt(Carryable);
  let finalCount = 1;
  if (itemToDrop.state && typeof itemToDrop.state.count === "number") {
    finalCount = itemToDrop.state.count;
  }
  const carryState = { ...(itemToDrop.state ?? {}) };
  if (isStackableItem(itemToDrop)) {
    carryState.count = finalCount;
  }
  carryable.setItemState(carryState);

  const pool = PoolManager.getInstance();
  const playerPos = player.getPosition();
  const droppedType = itemToDrop.itemType;
  const COMBINE_RADIUS_PLAYER = 15;
  const COMBINE_RADIUS_DROP = 20;

  const isStackable = isStackableItem(itemToDrop);

  function tryCombineAtPosition(x: number, y: number, radius: number): boolean {
    if (!isStackable) {
      return false;
    }
    const checkPos = pool.vector2.claim(x, y);
    const nearby = entityManager.getNearbyEntities(checkPos, radius);
    for (let i = 0; i < nearby.length; i++) {
      const other = nearby[i];
      if (!other.hasExt(Carryable) || !other.hasExt(Positionable)) {
        continue;
      }
      const otherCarry = other.getExt(Carryable);
      if (otherCarry.getItemType() !== droppedType) {
        continue;
      }
      const otherItemState = otherCarry.getItemState();
      const otherItem: InventoryItem = {
        itemType: otherCarry.getItemType(),
        state: otherItemState,
      };
      if (!isStackableItem(otherItem)) {
        continue;
      }
      const otherPos = other.getExt(Positionable).getCenterPosition();
      if (distance(checkPos, otherPos) <= radius) {
        const st = otherCarry.getItemState();
        let existing = 1;
        if (st && typeof st.count === "number") {
          existing = st.count;
        }
        otherCarry.setItemState({ count: existing + finalCount });
        entityManager.markEntityForRemoval(droppedEntity);
        entityManager.getBroadcaster().broadcastEvent(
          new PlayerDroppedItemEvent({
            playerId: player.getId(),
            itemType: droppedType,
          }),
        );
        return true;
      }
    }
    return false;
  }

  if (tryCombineAtPosition(playerPos.x, playerPos.y, COMBINE_RADIUS_PLAYER)) {
    return;
  }

  const facing = player.getSerialized().get("inputFacing");
  let dx = 0;
  let dy = 0;
  const dropOffset = getConfig().world.TILE_SIZE;
  if (facing === Direction.Up) {
    dy = -dropOffset;
  } else if (facing === Direction.Down) {
    dy = dropOffset;
  } else if (facing === Direction.Left) {
    dx = -dropOffset;
  } else {
    dx = dropOffset;
  }
  const dropPosX = playerPos.x + dx;
  const dropPosY = playerPos.y + dy;
  if (tryCombineAtPosition(dropPosX, dropPosY, COMBINE_RADIUS_DROP)) {
    return;
  }
  const dropPos = pool.vector2.claim(dropPosX, dropPosY);
  droppedEntity.getExt(Positionable).setPosition(dropPos);
  entityManager.addEntity(droppedEntity);
  entityManager.getBroadcaster().broadcastEvent(
    new PlayerDroppedItemEvent({
      playerId: player.getId(),
      itemType: droppedType,
    }),
  );
}

function bankStashFromBag(player: Player, bank: Bank, inv: Inventory, bagIndex: number): void {
  const item = inv.removeItem(bagIndex);
  if (!item) {
    return;
  }
  if (!bank.addOrMergeStack(item)) {
    inv.setBagSlot(bagIndex, item);
  }
}

function bankStashFromEquipment(
  player: Player,
  bank: Bank,
  inv: Inventory,
  equipSlot: EquipmentSlotKey,
): void {
  const item = inv.takeEquipmentItem(equipSlot);
  if (!item) {
    return;
  }
  if (!bank.addOrMergeStack(item)) {
    inv.setEquipmentSlot(equipSlot, item);
  }
}

function bankWithdrawToBag(player: Player, bank: Bank, inv: Inventory, bankIndex: number): void {
  const item = bank.removeItem(bankIndex);
  if (!item) {
    return;
  }
  const empty = firstEmptyBagIndex(inv);
  if (empty === null) {
    bank.setBankSlot(bankIndex, item);
    return;
  }
  if (!inv.addOrMergeStack(item)) {
    inv.setBagSlot(empty, item);
  }
}

function bankDropFromSource(
  player: Player,
  bank: Bank,
  inv: Inventory,
  source: BankActionEventData["source"],
  slotIndex: number,
): void {
  if (source === 0) {
    const item = inv.removeItem(slotIndex);
    if (item) {
      dropItemNearPlayerFacing(player, item);
    }
    return;
  }
  if (source === 1) {
    const item = bank.removeItem(slotIndex);
    if (item) {
      dropItemNearPlayerFacing(player, item);
    }
    return;
  }
  const slot = decodeEquipmentSlotKey(slotIndex);
  if (!slot) {
    return;
  }
  const item = inv.takeEquipmentItem(slot);
  if (item) {
    dropItemNearPlayerFacing(player, item);
  }
}

function bankUseFromSource(
  player: Player,
  bank: Bank,
  inv: Inventory,
  source: BankActionEventData["source"],
  slotIndex: number,
): void {
  let item: InventoryItem | undefined;
  let restoreBankIdx: number | null = null;
  if (source === 1) {
    item = bank.removeItem(slotIndex);
    restoreBankIdx = slotIndex;
  } else if (source === 0) {
    item = inv.removeItem(slotIndex);
  } else {
    const slot = decodeEquipmentSlotKey(slotIndex);
    if (!slot) {
      return;
    }
    item = inv.takeEquipmentItem(slot);
  }
  if (!item) {
    return;
  }

  const empty = firstEmptyBagIndex(inv);
  if (empty === null) {
    if (restoreBankIdx !== null) {
      bank.setBankSlot(restoreBankIdx, item);
    } else if (source === 0) {
      inv.setBagSlot(slotIndex, item);
    } else {
      const slot = decodeEquipmentSlotKey(slotIndex);
      if (slot) {
        inv.setEquipmentSlot(slot, item);
      }
    }
    return;
  }

  inv.setBagSlot(empty, item);
  const entity = player.getEntityManager().createEntityFromItem(item);
  if (!entity || !entity.hasExt(Consumable)) {
    inv.removeItem(empty);
    if (restoreBankIdx !== null) {
      bank.setBankSlot(restoreBankIdx, item);
    } else if (source === 0) {
      inv.setBagSlot(slotIndex, item);
    } else {
      const slot = decodeEquipmentSlotKey(slotIndex);
      if (slot) {
        inv.setEquipmentSlot(slot, item);
      }
    }
    return;
  }
  entity.getExt(Consumable).consume(player.getId(), empty);
}

/** equipSlotIndex: 0–6 armor; 7–11 weapon/consumable loadout rows (see client). */
function bankEquipFromSource(
  player: Player,
  bank: Bank,
  inv: Inventory,
  source: BankActionEventData["source"],
  slotIndex: number,
  equipSlotIndex: number,
): void {
  let item: InventoryItem | undefined;
  let restoreBankIdx: number | null = null;
  let restoreBagIdx: number | null = null;

  if (source === 1) {
    item = bank.removeItem(slotIndex);
    restoreBankIdx = slotIndex;
  } else if (source === 0) {
    item = inv.removeItem(slotIndex);
    restoreBagIdx = slotIndex;
  } else {
    return;
  }
  if (!item) {
    return;
  }

  const loadoutRow = equipSlotIndex >= 7 && equipSlotIndex <= 11 ? equipSlotIndex - 7 : null;
  const armorSlot = equipSlotIndex <= 6 ? decodeEquipmentSlotKey(equipSlotIndex) : null;

  const empty = firstEmptyBagIndex(inv);
  if (empty === null) {
    if (restoreBankIdx !== null) {
      bank.setBankSlot(restoreBankIdx, item);
    } else if (restoreBagIdx !== null) {
      inv.setBagSlot(restoreBagIdx, item);
    }
    return;
  }

  inv.setBagSlot(empty, item);

  if (loadoutRow !== null) {
    if (loadoutRow <= 2) {
      if (!itemMatchesLoadoutRow(item.itemType, loadoutRow as 0 | 1 | 2)) {
        inv.removeItem(empty);
        if (restoreBankIdx !== null) {
          bank.setBankSlot(restoreBankIdx, item);
        } else if (restoreBagIdx !== null) {
          inv.setBagSlot(restoreBagIdx, item);
        }
        return;
      }
    } else {
      if (!itemMatchesConsumableLoadout(item.itemType)) {
        inv.removeItem(empty);
        if (restoreBankIdx !== null) {
          bank.setBankSlot(restoreBankIdx, item);
        } else if (restoreBagIdx !== null) {
          inv.setBagSlot(restoreBagIdx, item);
        }
        return;
      }
    }
    player.assignWeaponLoadoutSlot(loadoutRow, empty + 1);
    return;
  }

  if (!armorSlot) {
    inv.removeItem(empty);
    if (restoreBankIdx !== null) {
      bank.setBankSlot(restoreBankIdx, item);
    } else if (restoreBagIdx !== null) {
      inv.setBagSlot(restoreBagIdx, item);
    }
    return;
  }

  if (!canItemGoInEquipmentSlot(item.itemType, armorSlot)) {
    inv.removeItem(empty);
    if (restoreBankIdx !== null) {
      bank.setBankSlot(restoreBankIdx, item);
    } else if (restoreBagIdx !== null) {
      inv.setBagSlot(restoreBagIdx, item);
    }
    return;
  }

  inv.swapBagAndEquipment(empty, armorSlot);
}

export function onBankAction(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: BankActionEventData,
): void {
  const entity = context.players.get(socket.id);
  if (!entity) {
    return;
  }
  const player = entity as Player;
  if (player.isZombie()) {
    return;
  }
  if (!assertLockerInRange(player, data.lockerEntityId)) {
    return;
  }

  const inv = player.getExt(Inventory);
  const bank = player.getExt(Bank);

  switch (data.action) {
    case 0: {
      if (data.source === 0) {
        bankStashFromBag(player, bank, inv, data.slotIndex);
      } else if (data.source === 2) {
        const slot = decodeEquipmentSlotKey(data.slotIndex);
        if (slot) {
          bankStashFromEquipment(player, bank, inv, slot);
        }
      }
      break;
    }
    case 1:
      if (data.source === 1) {
        bankWithdrawToBag(player, bank, inv, data.slotIndex);
      }
      break;
    case 2:
      bankDropFromSource(player, bank, inv, data.source, data.slotIndex);
      break;
    case 3:
      bankUseFromSource(player, bank, inv, data.source, data.slotIndex);
      break;
    case 4:
      bankEquipFromSource(player, bank, inv, data.source, data.slotIndex, data.equipSlotIndex);
      break;
    default:
      break;
  }
}

export const bankActionHandler: SocketEventHandler<BankActionEventData> = {
  event: "BANK_ACTION",
  handler: (context, socket, payload) => {
    const validated = validateBankPayload(payload);
    if (!validated) {
      console.warn(`Invalid bank action from socket ${socket.id}`);
      return;
    }
    onBankAction(context, socket, validated);
  },
};
