import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import { SocketEventHandler } from "./types";
import { getConfig } from "@shared/config";

export function onSwapInventoryItems(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { fromSlotIndex: number; toSlotIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);
  
  // Validate indices
  const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
  if (
    data.fromSlotIndex < 0 ||
    data.toSlotIndex < 0 ||
    data.fromSlotIndex >= maxSlots ||
    data.toSlotIndex >= maxSlots
  ) {
    return;
  }

  // Swap items
  inventory.swapItems(data.fromSlotIndex, data.toSlotIndex);
}

export const swapInventoryItemsHandler: SocketEventHandler<{
  fromSlotIndex: number;
  toSlotIndex: number;
}> = {
  event: "SWAP_INVENTORY_ITEMS",
  handler: onSwapInventoryItems,
};
