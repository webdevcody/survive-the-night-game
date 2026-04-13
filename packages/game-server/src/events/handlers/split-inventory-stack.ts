import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";

function validateSplitInventoryStackData(
  data: unknown,
): { slotIndex: number; quantity: number } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;
  const slotIndex = obj.slotIndex;
  const quantity = obj.quantity;
  if (
    typeof slotIndex !== "number" ||
    !Number.isFinite(slotIndex) ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0
  ) {
    return null;
  }
  if (
    typeof quantity !== "number" ||
    !Number.isFinite(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 1
  ) {
    return null;
  }

  return { slotIndex, quantity };
}

export function onSplitInventoryStack(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { slotIndex: number; quantity: number },
): void {
  const player = context.players.get(socket.id);
  if (!player) {
    return;
  }

  player.splitInventoryStack(data.slotIndex, data.quantity);
}

export const splitInventoryStackHandler: SocketEventHandler<{
  slotIndex: number;
  quantity: number;
}> = {
  event: "SPLIT_INVENTORY_STACK",
  handler: (context, socket, data) => {
    const validated = validateSplitInventoryStackData(data);
    if (!validated) {
      console.warn(`Invalid split inventory stack data from socket ${socket.id}`);
      return;
    }
    onSplitInventoryStack(context, socket, validated);
  },
};
