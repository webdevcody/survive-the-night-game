export function onTeleportToBase(context, socket) {
    const player = context.players.get(socket.id);
    if (!player)
        return;
    if (player.isDead())
        return;
    const spawnPosition = context.getMapManager().getPlayerSpawnPositionForMap();
    player.setPosition(spawnPosition);
}
export const teleportToBaseHandler = {
    event: "TELEPORT_TO_BASE",
    handler: onTeleportToBase,
};
