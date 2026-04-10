import { getConfig } from "@shared/config";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
/**
 * Validate select inventory slot data
 */
function validateSelectSlotData(data) {
    if (typeof data !== "object" || data === null) {
        return null;
    }
    const obj = data;
    // Validate slotIndex - must be a finite integer
    const slotIndex = obj.slotIndex;
    if (typeof slotIndex !== "number" ||
        !Number.isFinite(slotIndex) ||
        !Number.isInteger(slotIndex)) {
        return null;
    }
    return { slotIndex };
}
export function onSelectInventorySlot(context, socket, data) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (data.slotIndex === FISTS_INVENTORY_SENTINEL) {
        player.selectInventoryItemOnly(FISTS_INVENTORY_SENTINEL);
        return;
    }
    const slotIndex = Math.max(1, Math.min(maxSlots, data.slotIndex));
    // Use the existing selectInventoryItem method which handles marking inventory dirty
    player.selectInventoryItem(slotIndex);
}
export const selectInventorySlotHandler = {
    event: "SELECT_INVENTORY_SLOT",
    handler: (context, socket, data) => {
        const validated = validateSelectSlotData(data);
        if (!validated) {
            console.warn(`Invalid select inventory slot data from socket ${socket.id}`);
            return;
        }
        onSelectInventorySlot(context, socket, validated);
    },
};
