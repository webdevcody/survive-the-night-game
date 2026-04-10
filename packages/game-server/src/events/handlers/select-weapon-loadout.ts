import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { Player } from "@/entities/players/player";

function validate(data: unknown): { loadout: number } | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;
  const loadout = obj.loadout;
  if (typeof loadout !== "number" || !Number.isFinite(loadout) || !Number.isInteger(loadout)) {
    return null;
  }
  return { loadout };
}

export function onSelectWeaponLoadout(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { loadout: number }
): void {
  const entity = context.players.get(socket.id);
  if (!entity) return;
  const player = entity as Player;
  const lo = Math.max(0, Math.min(2, data.loadout));
  player.serialized.set("activeWeaponLoadout", lo);
  player.applyWeaponLoadoutSelection();
}

export const selectWeaponLoadoutHandler: SocketEventHandler<{ loadout: number }> = {
  event: "SELECT_WEAPON_LOADOUT",
  handler: (context, socket, data) => {
    const validated = validate(data);
    if (!validated) {
      console.warn(`Invalid selectWeaponLoadout from socket ${socket.id}`);
      return;
    }
    onSelectWeaponLoadout(context, socket, validated);
  },
};
