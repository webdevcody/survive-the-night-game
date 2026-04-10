import Groupable from "@/extensions/groupable";
import Positionable from "@/extensions/positionable";
/**
 * Open world — persistent shard, seeded map generation.
 */
export class OpenWorldModeStrategy {
    constructor() {
        this.config = {
            modeId: "open_world",
            displayName: "Open World",
            friendlyFireEnabled: false,
            allowRespawn: true,
            hasCarEntity: false,
            hasBosses: false,
            hasSurvivors: false,
            minPlayers: 1,
        };
    }
    getConfig() {
        return this.config;
    }
    onGameStart(_gameManagers) { }
    onGameEnd(_gameManagers) { }
    update(_deltaTime, _gameManagers) { }
    getPlayerSpawnPosition(_player, gameManagers) {
        return gameManagers.getMapManager().getPlayerSpawnPositionForMap();
    }
    handlePlayerSpawn(player, gameManagers) {
        const pending = player.consumePendingLogoutSpawnTile();
        if (pending) {
            const restored = gameManagers.getMapManager().tryGetPositionForSavedTile(pending.x, pending.y);
            if (restored) {
                player.getExt(Positionable).setPosition(restored);
                return;
            }
        }
        const spawnPosition = this.getPlayerSpawnPosition(player, gameManagers);
        player.getExt(Positionable).setPosition(spawnPosition);
    }
    canPlayerRespawn(_player) {
        return true;
    }
    checkWinCondition(_gameManagers) {
        return {
            gameEnded: false,
            winnerId: null,
            winnerName: null,
            message: "",
        };
    }
    shouldDamageTarget(attacker, target, attackerId) {
        if (target.getId() === attackerId) {
            return false;
        }
        if (!target.hasExt(Groupable)) {
            return false;
        }
        return target.getExt(Groupable).getGroup() === "enemy";
    }
    getZombieFallbackTarget(_gameManagers) {
        return null;
    }
}
