import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import Consumable from "@/extensions/consumable";
import { ItemType } from "@shared/util/inventory";
import { SocketEventHandler } from "./types";

export function onConsumeItem(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { itemType: ItemType | null }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  let itemIndex: number | undefined;
  let item: any | null = null;
  const inventory = player.getExt(Inventory);
  const inputInventoryItem = player.serialized.get("inputInventoryItem");

  // If itemType is specified, find the first item of that type
  if (data.itemType !== null) {
    const inventoryItems = inventory.getItems();
    const foundIndex = inventoryItems.findIndex(
      (invItem) => invItem?.itemType === data.itemType
    );

    if (foundIndex !== -1) {
      itemIndex = foundIndex;
      item = inventoryItems[itemIndex];
    }
  } else if (inputInventoryItem !== null) {
    // Otherwise, use the currently selected inventory slot
    itemIndex = inputInventoryItem - 1;
    item = inventory.getItems()[itemIndex];
  }

  if (item && itemIndex !== undefined) {
    const entity = player.getEntityManager().createEntityFromItem(item);
    if (!entity) return;

    if (entity.hasExt(Consumable)) {
      entity.getExt(Consumable).consume(player.getId(), itemIndex);
    }
  }
}

export const consumeItemHandler: SocketEventHandler<{ itemType: ItemType | null }> = {
  event: "CONSUME_ITEM",
  handler: onConsumeItem,
};

