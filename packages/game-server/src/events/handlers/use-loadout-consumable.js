import Inventory from "@/extensions/inventory";
import Consumable from "@/extensions/consumable";
import { itemMatchesConsumableLoadout } from "@shared/util/consumable-loadout";
function validate(data) {
    if (typeof data !== "object" || data === null)
        return null;
    const which = data.which;
    if (which !== 0 && which !== 1)
        return null;
    return { which };
}
export function onUseLoadoutConsumable(context, socket, data) {
    const entity = context.players.get(socket.id);
    if (!entity)
        return;
    const player = entity;
    const key = data.which === 0 ? "loadoutConsumable4" : "loadoutConsumable5";
    const bag = player.serialized.get(key);
    const inventory = player.getExt(Inventory);
    const maxSlots = inventory.getMaxSlots();
    if (typeof bag !== "number" || bag < 1 || bag > maxSlots)
        return;
    const itemIndex = bag - 1;
    const item = inventory.getItems()[itemIndex];
    if (!item || !itemMatchesConsumableLoadout(item.itemType))
        return;
    const itemEntity = player.getEntityManager().createEntityFromItem(item);
    if (!itemEntity || !itemEntity.hasExt(Consumable))
        return;
    itemEntity.getExt(Consumable).consume(player.getId(), itemIndex);
}
export const useLoadoutConsumableHandler = {
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
