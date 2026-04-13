import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import Inventory from "@/extensions/inventory";
import { coerceSignMessage } from "@shared/util/sign-message";

type SetSignTextPayload = {
  slotIndex: number;
  message: string;
};

function validateSetSignTextData(data: unknown): SetSignTextPayload | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const obj = data as Record<string, unknown>;
  const slotIndex = obj.slotIndex;
  const message = obj.message;

  if (
    typeof slotIndex !== "number" ||
    !Number.isFinite(slotIndex) ||
    !Number.isInteger(slotIndex) ||
    slotIndex < 0
  ) {
    return null;
  }

  if (typeof message !== "string") {
    return null;
  }

  return { slotIndex, message };
}

export function onSetSignText(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: SetSignTextPayload,
): void {
  const player = context.players.get(socket.id);
  if (!player) return;

  const inventory = player.getExt(Inventory);
  if (data.slotIndex >= inventory.getMaxSlots()) {
    return;
  }

  const item = inventory.getItems()[data.slotIndex];
  if (!item || item.itemType !== "sign") {
    return;
  }

  const sanitizedMessage = coerceSignMessage(context.sanitizeText(data.message));
  if (!sanitizedMessage) {
    return;
  }

  inventory.updateItemState(data.slotIndex, {
    ...(item.state ?? {}),
    message: sanitizedMessage,
  });
}

export const setSignTextHandler: SocketEventHandler<SetSignTextPayload> = {
  event: "SET_SIGN_TEXT",
  handler: (context, socket, data) => {
    const validated = validateSetSignTextData(data);
    if (!validated) {
      console.warn(`Invalid sign text payload from socket ${socket.id}`);
      return;
    }
    onSetSignText(context, socket, validated);
  },
};
