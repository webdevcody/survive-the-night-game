import Inventory from "@/extensions/inventory";
import { EQUIPMENT_SLOT_KEYS } from "@shared/util/inventory";
const EQUIP_SLOT_SET = new Set(EQUIPMENT_SLOT_KEYS);
function validateData(data) {
    if (typeof data !== "object" || data === null) {
        return null;
    }
    const obj = data;
    const bagIndex = obj.bagIndex;
    if (typeof bagIndex !== "number" ||
        !Number.isFinite(bagIndex) ||
        !Number.isInteger(bagIndex)) {
        return null;
    }
    const equipSlot = obj.equipSlot;
    if (typeof equipSlot !== "string" || !EQUIP_SLOT_SET.has(equipSlot)) {
        return null;
    }
    return { bagIndex, equipSlot: equipSlot };
}
export function onSwapBagAndEquipment(context, socket, data) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    const inventory = player.getExt(Inventory);
    const maxSlots = inventory.getMaxSlots();
    if (data.bagIndex < 0 || data.bagIndex >= maxSlots) {
        return;
    }
    inventory.swapBagAndEquipment(data.bagIndex, data.equipSlot);
}
export const swapBagAndEquipmentHandler = {
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
