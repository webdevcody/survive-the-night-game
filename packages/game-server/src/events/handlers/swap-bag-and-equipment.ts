import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import Inventory from "@/extensions/inventory";
import { SocketEventHandler } from "./types";
import { getConfig } from "@shared/config";
import type { EquipmentSlotKey } from "@shared/util/inventory";

function validateData(data: unknown): { bagIndex: number; equipSlot: EquipmentSlotKey } | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;

  const bagIndex = obj.bagIndex;
  if (
    typeof bagIndex !== "number" ||
    !Number.isFinite(bagIndex) ||
    !Number.isInteger(bagIndex)
  ) {
    return null;
  }

  const equipSlot = obj.equipSlot;
  if (equipSlot !== "head" && equipSlot !== "mainHand") {
    return null;
  }

  return { bagIndex, equipSlot };
}

export function onSwapBagAndEquipment(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { bagIndex: number; equipSlot: EquipmentSlotKey }
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);
  const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
  if (data.bagIndex < 0 || data.bagIndex >= maxSlots) {
    return;
  }

  inventory.swapBagAndEquipment(data.bagIndex, data.equipSlot);
}

export const swapBagAndEquipmentHandler: SocketEventHandler<{
  bagIndex: number;
  equipSlot: EquipmentSlotKey;
}> = {
  event: "SWAP_BAG_AND_EQUIPMENT",
  handler: (context, socket, data) => {
    const validated = validateData(data);
    if (!validated) {
      console.warn(`Invalid swap bag/equipment data from socket ${socket.id}`);
      return;
    }
    onSwapBagAndEquipment(context, socket, validated);
  },
};
