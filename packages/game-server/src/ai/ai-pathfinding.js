import { pathTowards } from "@shared/util/physics";
import { getConfig } from "@shared/config";
/**
 * AI pathfinding using ground + collidables from the map.
 */
export class AIPathfinder {
    constructor(gameManagers) {
        this.gameManagers = gameManagers;
        this.BIOME_SIZE = getConfig().world.BIOME_SIZE;
        this.TILE_SIZE = getConfig().world.TILE_SIZE;
    }
    pathTowardsAvoidingToxic(start, target) {
        const mapManager = this.gameManagers.getMapManager();
        return pathTowards(start, target, mapManager.getGroundLayer(), mapManager.getCollidablesLayer());
    }
    isToxicPosition(_position) {
        return false;
    }
    getMapCenter() {
        const MAP_SIZE = getConfig().world.MAP_SIZE;
        const centerTile = (MAP_SIZE * this.BIOME_SIZE) / 2;
        return {
            x: centerTile * this.TILE_SIZE,
            y: centerTile * this.TILE_SIZE,
        };
    }
    findNearestSafePosition(_currentPos) {
        return null;
    }
    pathTowardsSafety(_start) {
        return null;
    }
    pathThroughToxic(start, target) {
        return this.pathTowardsAvoidingToxic(start, target);
    }
}
