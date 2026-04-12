import { ISocketAdapter } from "@shared/network/socket-adapter";
import { HandlerContext } from "../context";
import { SocketEventHandler } from "./types";
import { Player } from "@/entities/players/player";
import Inventory from "@/extensions/inventory";
import Consumable from "@/extensions/consumable";
import { getConfig } from "@shared/config";
import { itemMatchesConsumableLoadout } from "@shared/util/consumable-loadout";

function validate(data: unknown): { which: 0 | 1 } | null {
  if (typeof data !== "object" || data === null) return null;
  const obj = data as Record<string, unknown>;
  const which = obj.which;
  if (which !== 0 && which !== 1) return null;
  return { which };
}

export function onUseLoadoutConsumable(
  context: HandlerContext,
  socket: ISocketAdapter,
  data: { which: 0 | 1 },
): void {
  const entity = context.players.get(socket.id);
  if (!entity) return;
  const player = entity as Player;

  const key = data.which === 0 ? "loadoutConsumable4" : "loadoutConsumable5";
  const bag = player.serialized.get(key);
  const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
  if (typeof bag !== "number" || bag < 1 || bag > maxSlots) return;

  const inventory = player.getExt(Inventory);
  const itemIndex = bag - 1;
  const item = inventory.getItems()[itemIndex];
  if (!item || !itemMatchesConsumableLoadout(item.itemType)) return;

  const itemEntity = player.getEntityManager().createEntityFromItem(item);
  if (!itemEntity || !itemEntity.hasExt(Consumable)) return;

  itemEntity.getExt(Consumable).consume(player.getId(), itemIndex);
}

export const useLoadoutConsumableHandler: SocketEventHandler<{ which: 0 | 1 }> = {
  event: "USE_LOADOUT_CONSUMABLE",
  handler: (context, socket, data) => {
    const validated = validate(data);
    if (!validated) {
      console.warn(`Invalid useLoadoutConsumable from socket ${socket.id}`);
      return;
    }
    onUseLoadoutConsumable(context, socket, validated);
  },
};
