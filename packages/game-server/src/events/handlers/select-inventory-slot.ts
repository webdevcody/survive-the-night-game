import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import { SocketEventHandler } from "./types";

export function onSelectInventorySlot(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { slotIndex: number }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  // Validate slot index (1-10)
  const slotIndex = Math.max(1, Math.min(10, data.slotIndex ?? 1));
  
  // Use the existing selectInventoryItem method which handles marking inventory dirty
  player.selectInventoryItem(slotIndex);
}

export const selectInventorySlotHandler: SocketEventHandler<{ slotIndex: number }> = {
  event: "SELECT_INVENTORY_SLOT",
  handler: onSelectInventorySlot,
};

