import Inventory from "@/extensions/inventory";
/**
 * Validate swap inventory items data
 */
function validateSwapData(data) {
    if (typeof data !== "object" || data === null) {
        return null;
    }
    const obj = data;
    // Validate fromSlotIndex - must be a finite integer
    const fromSlotIndex = obj.fromSlotIndex;
    if (typeof fromSlotIndex !== "number" ||
        !Number.isFinite(fromSlotIndex) ||
        !Number.isInteger(fromSlotIndex)) {
        return null;
    }
    // Validate toSlotIndex - must be a finite integer
    const toSlotIndex = obj.toSlotIndex;
    if (typeof toSlotIndex !== "number" ||
        !Number.isFinite(toSlotIndex) ||
        !Number.isInteger(toSlotIndex)) {
        return null;
    }
    return { fromSlotIndex, toSlotIndex };
}
export function onSwapInventoryItems(context, socket, data) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    const inventory = player.getExt(Inventory);
    // Validate indices against the player's current bag size (base + strength).
    const maxSlots = inventory.getMaxSlots();
    if (data.fromSlotIndex < 0 ||
        data.toSlotIndex < 0 ||
        data.fromSlotIndex >= maxSlots ||
        data.toSlotIndex >= maxSlots) {
        return;
    }
    // Swap items
    inventory.swapItems(data.fromSlotIndex, data.toSlotIndex);
}
export const swapInventoryItemsHandler = {
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
