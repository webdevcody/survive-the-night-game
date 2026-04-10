import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { Player } from "@/entities/players/player";

function validate(data: unknown): { slot: number; bagIndex: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;
  const slot = obj.slot;
  const bagIndex = obj.bagIndex;
  if (typeof slot !== "number" || !Number.isFinite(slot) || !Number.isInteger(slot)) {
    return null;
  }
  if (typeof bagIndex !== "number" || !Number.isFinite(bagIndex) || !Number.isInteger(bagIndex)) {
    return null;
  }
  return { slot, bagIndex };
}

export function onSetWeaponLoadoutSlot(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { slot: number; bagIndex: number }
): void {
  const entity = context.players.get(socket.id);
  if (!entity) return;
  const player = entity as Player;
  player.assignWeaponLoadoutSlot(data.slot, data.bagIndex);
}

export const setWeaponLoadoutSlotHandler: SocketEventHandler<{ slot: number; bagIndex: number }> = {
  event: "SET_WEAPON_LOADOUT_SLOT",
  handler: (context, socket, data) => {
    const validated = validate(data);
    if (!validated) {
      console.warn(`Invalid setWeaponLoadoutSlot from socket ${socket.id}`);
      return;
    }
    onSetWeaponLoadoutSlot(context, socket, validated);
  },
};
