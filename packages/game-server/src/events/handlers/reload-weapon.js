export function onReloadWeapon(context, socket) {
    const player = context.players.get(socket.id);
    if (!player) {
        return;
    }
    player.requestReload();
}
export const reloadWeaponHandler = {
    event: "RELOAD_WEAPON",
    handler: (context, socket) => {
        onReloadWeapon(context, socket);
    },
};
