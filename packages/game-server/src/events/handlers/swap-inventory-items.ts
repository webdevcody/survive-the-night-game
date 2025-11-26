import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import { SocketEventHandler } from "./types";
import { getConfig } from "@shared/config";

/**
 * Validate swap inventory items data
 */
function validateSwapData(
  data: unknown
): { fromSlotIndex: number; toSlotIndex: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  // Validate fromSlotIndex - must be a finite integer
  const fromSlotIndex = obj.fromSlotIndex;
  if (
    typeof fromSlotIndex !== "number" ||
    !Number.isFinite(fromSlotIndex) ||
    !Number.isInteger(fromSlotIndex)
  ) {
    return null;
  }

  // Validate toSlotIndex - must be a finite integer
  const toSlotIndex = obj.toSlotIndex;
  if (
    typeof toSlotIndex !== "number" ||
    !Number.isFinite(toSlotIndex) ||
    !Number.isInteger(toSlotIndex)
  ) {
    return null;
  }

  return { fromSlotIndex, toSlotIndex };
}

export function onSwapInventoryItems(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { fromSlotIndex: number; toSlotIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);

  // Validate indices against config
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
  handler: (context, socket, data) => {
    const validated = validateSwapData(data);
    if (!validated) {
      console.warn(`Invalid swap inventory items data from socket ${socket.id}`);
      return;
    }
    onSwapInventoryItems(context, socket, validated);
  },
};
