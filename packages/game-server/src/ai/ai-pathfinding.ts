import { IGameManagers } from "@/managers/types";
import { pathTowards } from "@shared/util/physics";
import Vector2 from "@/util/vector2";
import { getConfig } from "@shared/config";

/**
 * AI pathfinding using ground + collidables from the map.
 */
export class AIPathfinder {
  private gameManagers: IGameManagers;
  private readonly BIOME_SIZE: number;
  private readonly TILE_SIZE: number;

  constructor(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.BIOME_SIZE = getConfig().world.BIOME_SIZE;
    this.TILE_SIZE = getConfig().world.TILE_SIZE;
  }

  pathTowardsAvoidingToxic(start: Vector2, target: Vector2): Vector2 | null {
    const mapManager = this.gameManagers.getMapManager();
    return pathTowards(
      start,
      target,
      mapManager.getGroundLayer(),
      mapManager.getCollidablesLayer(),
    );
  }

  isToxicPosition(_position: Vector2): boolean {
    return false;
  }

  getMapCenter(): Vector2 {
    const MAP_SIZE = getConfig().world.MAP_SIZE;
    const centerTile = (MAP_SIZE * this.BIOME_SIZE) / 2;

    return {
      x: centerTile * this.TILE_SIZE,
      y: centerTile * this.TILE_SIZE,
    } as Vector2;
  }

  findNearestSafePosition(_currentPos: Vector2): Vector2 | null {
    return null;
  }

  pathTowardsSafety(_start: Vector2): Vector2 | null {
    return null;
  }

  pathThroughToxic(start: Vector2, target: Vector2): Vector2 | null {
    return this.pathTowardsAvoidingToxic(start, target);
  }
}
