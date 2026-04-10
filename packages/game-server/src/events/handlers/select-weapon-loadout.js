function validate(data) {
    if (typeof data !== "object" || data === null)
        return null;
    const obj = data;
    const loadout = obj.loadout;
    if (typeof loadout !== "number" || !Number.isFinite(loadout) || !Number.isInteger(loadout)) {
        return null;
    }
    return { loadout };
}
export function onSelectWeaponLoadout(context, socket, data) {
    const entity = context.players.get(socket.id);
    if (!entity)
        return;
    const player = entity;
    const lo = Math.max(0, Math.min(2, data.loadout));
    player.serialized.set("activeWeaponLoadout", lo);
    player.applyWeaponLoadoutSelection();
}
export const selectWeaponLoadoutHandler = {
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
