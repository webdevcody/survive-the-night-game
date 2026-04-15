import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import Consumable from "@/extensions/consumable";
import { ItemType } from "@shared/util/inventory";
import { SocketEventHandler } from "./types";

/**
 * Validate consume item data
 */
function validateConsumeItemData(data: unknown): { itemType: ItemType | null; slotIndex?: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate itemType - must be a string or null
  const itemType = obj.itemType;
  if (itemType !== null && typeof itemType !== "string") {
    return null;
  }

  const slotIndex = obj.slotIndex;
  if (slotIndex !== undefined && slotIndex !== null) {
    if (
      typeof slotIndex !== "number" ||
      !Number.isFinite(slotIndex) ||
      !Number.isInteger(slotIndex) ||
      slotIndex < 0
    ) {
      return null;
    }
    return { itemType: itemType as ItemType | null, slotIndex };
  }

  return { itemType: itemType as ItemType | null, slotIndex: undefined };
}

export function onConsumeItem(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { itemType: ItemType | null; slotIndex?: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  let itemIndex: number | undefined;
  let item: any | null = null;
  const inventory = player.getExt(Inventory);
  const inputInventoryItem = player.serialized.get("inputInventoryItem");

  if (typeof data.slotIndex === "number") {
    const maxSlots = inventory.getMaxSlots();
    if (data.slotIndex >= 0 && data.slotIndex < maxSlots) {
      itemIndex = data.slotIndex;
      item = inventory.getItems()[itemIndex];
    }
  } else if (data.itemType !== null) {
    // If itemType is specified, find the first item of that type
    const inventoryItems = inventory.getItems();
    const foundIndex = inventoryItems.findIndex(
      (invItem) => invItem?.itemType === data.itemType
    );

    if (foundIndex !== -1) {
      itemIndex = foundIndex;
      item = inventoryItems[itemIndex];
    }
  } else if (inputInventoryItem !== null) {
    const maxSlots = inventory.getMaxSlots();
    if (
      typeof inputInventoryItem === "number" &&
      inputInventoryItem >= 1 &&
      inputInventoryItem <= maxSlots
    ) {
      itemIndex = inputInventoryItem - 1;
      item = inventory.getItems()[itemIndex];
    }
  }

  if (item && itemIndex !== undefined) {
    if (item.itemType === "skateboard") {
      player.toggleSkateboardFromBagIndex(itemIndex);
      return;
    }

    const entity = player.getEntityManager().createEntityFromItem(item);
    if (!entity) return;

    if (entity.hasExt(Consumable)) {
      entity.getExt(Consumable).consume(player.getId(), itemIndex);
    }
  }
}

export const consumeItemHandler: SocketEventHandler<{ itemType: ItemType | null; slotIndex?: number }> = {
  event: "CONSUME_ITEM",
  handler: (context, socket, data) => {
    const validated = validateConsumeItemData(data);
    if (!validated) {
      console.warn(`Invalid consume item data from socket ${socket.id}`);
      return;
    }
    onConsumeItem(context, socket, validated);
  },
};

