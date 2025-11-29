import { IGameManagers } from "@/managers/types";
import { pathTowards } from "@shared/util/physics";
import Vector2 from "@/util/vector2";
import { getConfig } from "@shared/config";
import { BattleRoyaleModeStrategy } from "@/game-modes/battle-royale-mode-strategy";

/**
 * AI Pathfinding wrapper that avoids toxic zones
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

  /**
   * Find a path from start to target, avoiding toxic zones
   * Returns the next waypoint to move toward, or null if no path found
   */
  pathTowardsAvoidingToxic(start: Vector2, target: Vector2): Vector2 | null {
    const mapManager = this.gameManagers.getMapManager();
    const groundLayer = mapManager.getGroundLayer();
    const baseCollidables = mapManager.getCollidablesLayer();

    // Create a modified collidables layer that marks toxic zones as blocked
    const modifiedCollidables = this.createToxicAwareCollidables(baseCollidables);

    return pathTowards(start, target, groundLayer, modifiedCollidables);
  }

  /**
   * Create a modified collidables layer that treats toxic biomes as obstacles
   */
  private createToxicAwareCollidables(baseCollidables: number[][]): number[][] {
    const strategy = this.gameManagers.getGameServer().getGameLoop().getGameModeStrategy();

    // Only modify for battle royale mode
    if (!(strategy instanceof BattleRoyaleModeStrategy)) {
      return baseCollidables;
    }

    const toxicBiomes = strategy.getToxicBiomes();

    // If no toxic biomes yet, return original
    if (toxicBiomes.size === 0) {
      return baseCollidables;
    }

    // Clone the base collidables layer
    const modified = baseCollidables.map((row) => [...row]);

    // Mark tiles in toxic biomes as blocked (use a non -1 value to indicate blocked)
    for (const biomeKey of toxicBiomes) {
      const [biomeXStr, biomeYStr] = biomeKey.split(",");
      const biomeX = parseInt(biomeXStr, 10);
      const biomeY = parseInt(biomeYStr, 10);

      const startTileX = biomeX * this.BIOME_SIZE;
      const startTileY = biomeY * this.BIOME_SIZE;

      for (let y = startTileY; y < startTileY + this.BIOME_SIZE; y++) {
        for (let x = startTileX; x < startTileX + this.BIOME_SIZE; x++) {
          if (y < modified.length && x < modified[0].length) {
            // Mark as blocked with a high tile ID (9999 indicates AI-blocked)
            modified[y][x] = 9999;
          }
        }
      }
    }

    return modified;
  }

  /**
   * Check if a world position is inside a toxic zone
   */
  isToxicPosition(position: Vector2): boolean {
    const strategy = this.gameManagers.getGameServer().getGameLoop().getGameModeStrategy();

    if (!(strategy instanceof BattleRoyaleModeStrategy)) {
      return false;
    }

    const biomeX = Math.floor(position.x / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeY = Math.floor(position.y / (this.BIOME_SIZE * this.TILE_SIZE));
    const biomeKey = `${biomeX},${biomeY}`;

    return strategy.getToxicBiomes().has(biomeKey);
  }

  /**
   * Get the center of the map (safest location as toxic spreads from edges)
   */
  getMapCenter(): Vector2 {
    const MAP_SIZE = getConfig().world.MAP_SIZE;
    const centerTile = (MAP_SIZE * this.BIOME_SIZE) / 2;

    return {
      x: centerTile * this.TILE_SIZE,
      y: centerTile * this.TILE_SIZE,
    } as Vector2;
  }

  /**
   * Find the nearest safe position when AI is inside a toxic zone
   * Returns a waypoint at the edge of the safe zone toward map center
   */
  findNearestSafePosition(currentPos: Vector2): Vector2 | null {
    const strategy = this.gameManagers.getGameServer().getGameLoop().getGameModeStrategy();

    if (!(strategy instanceof BattleRoyaleModeStrategy)) {
      return null;
    }

    const toxicBiomes = strategy.getToxicBiomes();
    if (toxicBiomes.size === 0) {
      return null;
    }

    // Calculate direction toward map center (safest area)
    const mapCenter = this.getMapCenter();
    const dirX = mapCenter.x - currentPos.x;
    const dirY = mapCenter.y - currentPos.y;
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);

    if (mag === 0) {
      return null; // Already at center
    }

    const normalizedDirX = dirX / mag;
    const normalizedDirY = dirY / mag;

    // Walk in the direction of map center until we find a safe position
    // Check at intervals of half biome size
    const stepSize = (this.BIOME_SIZE * this.TILE_SIZE) / 2;
    const maxSteps = 20; // Don't search forever

    for (let step = 1; step <= maxSteps; step++) {
      const testX = currentPos.x + normalizedDirX * stepSize * step;
      const testY = currentPos.y + normalizedDirY * stepSize * step;
      const testPos = { x: testX, y: testY } as Vector2;

      if (!this.isToxicPosition(testPos)) {
        // Found safe position - return a waypoint slightly inside safe zone
        return testPos;
      }
    }

    // Ultimate fallback: return map center
    return mapCenter;
  }

  /**
   * Path toward safety when starting inside a toxic zone
   * This bypasses the normal pathfinding which would fail
   * Returns a direct waypoint toward the nearest safe area
   */
  pathTowardsSafety(start: Vector2): Vector2 | null {
    // If not in toxic zone, use normal pathfinding
    if (!this.isToxicPosition(start)) {
      return null;
    }

    // Find the nearest safe position
    const safePos = this.findNearestSafePosition(start);
    if (!safePos) {
      return null;
    }

    // Return a waypoint in the direction of safety
    // Move in steps to avoid walking through obstacles
    const dirX = safePos.x - start.x;
    const dirY = safePos.y - start.y;
    const mag = Math.sqrt(dirX * dirX + dirY * dirY);

    if (mag === 0) {
      return null;
    }

    // Return a waypoint 50 pixels toward safety
    // This allows the AI to move incrementally and recheck each tick
    const stepDistance = Math.min(50, mag);
    return {
      x: start.x + (dirX / mag) * stepDistance,
      y: start.y + (dirY / mag) * stepDistance,
    } as Vector2;
  }

  /**
   * Find a path from start to target WITHOUT marking toxic zones as blocked
   * This is used when the AI is INSIDE a toxic zone and needs to escape
   * It still avoids real obstacles (trees, rocks) but allows pathing through toxic areas
   */
  pathThroughToxic(start: Vector2, target: Vector2): Vector2 | null {
    const mapManager = this.gameManagers.getMapManager();
    const groundLayer = mapManager.getGroundLayer();
    const baseCollidables = mapManager.getCollidablesLayer();

    // Use base collidables WITHOUT toxic zone blocking
    // This allows AI to path through toxic zones when escaping
    return pathTowards(start, target, groundLayer, baseCollidables);
  }
}
