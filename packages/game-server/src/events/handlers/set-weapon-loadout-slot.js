function validate(data) {
    if (typeof data !== "object" || data === null)
        return null;
    const obj = data;
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
export function onSetWeaponLoadoutSlot(context, socket, data) {
    const entity = context.players.get(socket.id);
    if (!entity)
        return;
    const player = entity;
    player.assignWeaponLoadoutSlot(data.slot, data.bagIndex);
}
export const setWeaponLoadoutSlotHandler = {
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
