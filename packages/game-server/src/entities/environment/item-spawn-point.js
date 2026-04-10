import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { Entities } from "@/constants";
import { getItemFixtureRespawnMs } from "@shared/map/spawn-palette";
import { getConfig } from "@shared/config";
import PoolManager from "@shared/util/pool-manager";
/**
 * Authored map fixture: spawns and respawns a pickup item at a fixed tile (spawns layer tile ids from ITEM_SPAWN_TILE_ID_MIN).
 */
export class ItemSpawnPoint extends Entity {
    constructor(gameManagers, itemEntityType, tileX, tileY, useAuthoredPlacementRules) {
        super(gameManagers, Entities.ITEM_SPAWN_POINT);
        this.activeItemId = null;
        this.respawnAtMs = null;
        this.itemEntityType = itemEntityType;
        this.tileX = tileX;
        this.tileY = tileY;
        this.useAuthoredPlacementRules = useAuthoredPlacementRules;
        const poolManager = PoolManager.getInstance();
        const TILE_SIZE = getConfig().world.TILE_SIZE;
        const size = poolManager.vector2.claim(TILE_SIZE, TILE_SIZE);
        const topLeft = poolManager.vector2.claim(tileX * TILE_SIZE, tileY * TILE_SIZE);
        this.addExtension(new Positionable(this).setSize(size).setPosition(topLeft));
        this.trySpawnInitialItem();
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
    trySpawnInitialItem() {
        if (!this.placementAllowsSpawn(true)) {
            return;
        }
        const pos = this.getFixturePixelPosition();
        const entity = this.getEntityManager().createEntity(this.itemEntityType);
        if (!entity) {
            PoolManager.getInstance().vector2.release(pos);
            return;
        }
        entity.getExt(Positionable).setPosition(pos);
        this.getEntityManager().addEntity(entity);
        this.activeItemId = entity.getId();
    }
    tick(_deltaTime) {
        const em = this.getEntityManager();
        const now = Date.now();
        const respawnMs = getItemFixtureRespawnMs(this.itemEntityType);
        if (this.activeItemId !== null) {
            const entity = em.getEntityById(this.activeItemId);
            if (entity && !entity.isMarkedForRemoval()) {
                return;
            }
            this.activeItemId = null;
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
        const entity = em.createEntity(this.itemEntityType);
        if (!entity) {
            PoolManager.getInstance().vector2.release(pos);
            return;
        }
        entity.getExt(Positionable).setPosition(pos);
        em.addEntity(entity);
        this.activeItemId = entity.getId();
        this.respawnAtMs = null;
    }
}
