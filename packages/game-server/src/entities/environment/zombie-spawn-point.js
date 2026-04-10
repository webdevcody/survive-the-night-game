import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities } from "@/constants";
import { ZombieFactory } from "@/util/zombie-factory";
import { getEnemySpawnRespawnMs } from "@shared/map/spawn-palette";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
/**
 * Open-world fixture: spawns and respawns a zombie at a fixed tile (editor spawns layer or procedural picks).
 */
export class ZombieSpawnPoint extends Entity {
    constructor(gameManagers, zombieType, tileX, tileY, useAuthoredPlacementRules) {
        super(gameManagers, Entities.ZOMBIE_SPAWN_POINT);
        this.activeZombieId = null;
        this.respawnAtMs = null;
        this.zombieType = zombieType;
        this.tileX = tileX;
        this.tileY = tileY;
        this.useAuthoredPlacementRules = useAuthoredPlacementRules;
        const poolManager = PoolManager.getInstance();
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        const size = poolManager.vector2.claim(TILE_SIZE, TILE_SIZE);
        const topLeft = poolManager.vector2.claim(tileX * TILE_SIZE, tileY * TILE_SIZE);
        this.addExtension(new Positionable(this).setSize(size).setPosition(topLeft));
        this.trySpawnInitialZombie();
        this.addExtension(new Updatable(this, (deltaTime) => {
            this.tick(deltaTime);
        }));
    }
    getFixturePixelPosition() {
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        return PoolManager.getInstance().vector2.claim(this.tileX * TILE_SIZE, this.tileY * TILE_SIZE);
    }
    placementAllowsSpawn(checkEntities) {
        const pos = this.getFixturePixelPosition();
        const map = this.getGameManagers().getMapManager();
        const ok = this.useAuthoredPlacementRules
            ? map.isAuthoredZombieFixtureSpawnValid(pos, checkEntities)
            : map.isPositionValidForPlacement(pos, checkEntities);
        PoolManager.getInstance().vector2.release(pos);
        return ok;
    }
    trySpawnInitialZombie() {
        if (!this.placementAllowsSpawn(true)) {
            return;
        }
        const pos = this.getFixturePixelPosition();
        const zombie = ZombieFactory.createZombie(this.zombieType, this.getGameManagers(), {
            position: pos,
            addToManager: true,
        });
        this.activeZombieId = zombie.getId();
    }
    tick(_deltaTime) {
        const em = this.getEntityManager();
        const now = Date.now();
        const respawnMs = getEnemySpawnRespawnMs(this.zombieType);
        if (this.activeZombieId !== null) {
            const entity = em.getEntityById(this.activeZombieId);
            if (entity && !entity.isMarkedForRemoval()) {
                return;
            }
            this.activeZombieId = null;
            this.respawnAtMs = now + respawnMs;
            return;
        }
        if (this.respawnAtMs === null || now < this.respawnAtMs) {
            return;
        }
        const pos = this.getFixturePixelPosition();
        if (!this.placementAllowsSpawn(true)) {
            PoolManager.getInstance().vector2.release(pos);
            return;
        }
        const zombie = ZombieFactory.createZombie(this.zombieType, this.getGameManagers(), {
            position: pos,
            addToManager: true,
        });
        this.activeZombieId = zombie.getId();
        this.respawnAtMs = null;
    }
}
