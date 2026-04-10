export function onSpawnZombie(_context, _socket, _payload) {
    // Zombie spawn-from-player was tied to removed infection mode; ignore.
}
export const spawnZombieHandler = {
    event: "SPAWN_ZOMBIE",
    handler: onSpawnZombie,
};
