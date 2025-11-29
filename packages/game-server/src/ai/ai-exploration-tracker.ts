import Vector2 from "@shared/util/vector2";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";

/**
 * Tracks which grid cells each AI player has explored
 * Uses a grid-based system to avoid re-exploring the same areas
 */
export class AIExplorationTracker {
  // Track explored cells as "cellX,cellY" strings
  private exploredCells: Set<string> = new Set();
  
  // Track explored biomes as "biomeX,biomeY" strings
  private exploredBiomes: Set<string> = new Set();
  
  // Grid cell size for exploration tracking (larger cells = less granular)
  private readonly CELL_SIZE: number;
  private readonly BIOME_SIZE: number;
  private readonly TILE_SIZE: number;

  constructor() {
    this.CELL_SIZE = 128; // 8 tiles = 128 pixels (reasonable exploration granularity)
    this.BIOME_SIZE = getConfig().world.BIOME_SIZE;
    this.TILE_SIZE = getConfig().world.TILE_SIZE;
  }

  /**
   * Mark the current position as explored
   */
  markExplored(position: Vector2): void {
    const cellKey = this.getCellKey(position);
    this.exploredCells.add(cellKey);
    
    const biomeKey = this.getBiomeKey(position);
    this.exploredBiomes.add(biomeKey);
  }

  /**
   * Check if a position has been explored
   */
  isExplored(position: Vector2): boolean {
    const cellKey = this.getCellKey(position);
    return this.exploredCells.has(cellKey);
  }

  /**
   * Check if a biome has been explored
   */
  isBiomeExplored(biomeX: number, biomeY: number): boolean {
    const biomeKey = `${biomeX},${biomeY}`;
    return this.exploredBiomes.has(biomeKey);
  }

  /**
   * Get the exploration percentage of nearby cells
   * Returns a value between 0 and 1
   */
  getExplorationScore(center: Vector2, radius: number): number {
    const cellsInRadius = this.getCellsInRadius(center, radius);
    if (cellsInRadius.length === 0) return 0;

    let exploredCount = 0;
    for (const cellKey of cellsInRadius) {
      if (this.exploredCells.has(cellKey)) {
        exploredCount++;
      }
    }

    return exploredCount / cellsInRadius.length;
  }

  /**
   * Get cell key for a position
   */
  private getCellKey(position: Vector2): string {
    const cellX = Math.floor(position.x / this.CELL_SIZE);
    const cellY = Math.floor(position.y / this.CELL_SIZE);
    return `${cellX},${cellY}`;
  }

  /**
   * Get biome key for a position
   */
  private getBiomeKey(position: Vector2): string {
    const tileX = Math.floor(position.x / this.TILE_SIZE);
    const tileY = Math.floor(position.y / this.TILE_SIZE);
    const biomeX = Math.floor(tileX / this.BIOME_SIZE);
    const biomeY = Math.floor(tileY / this.BIOME_SIZE);
    return `${biomeX},${biomeY}`;
  }

  /**
   * Get all cell keys within a radius
   */
  private getCellsInRadius(center: Vector2, radius: number): string[] {
    const cells: string[] = [];
    const cellRadius = Math.ceil(radius / this.CELL_SIZE);

    const centerCellX = Math.floor(center.x / this.CELL_SIZE);
    const centerCellY = Math.floor(center.y / this.CELL_SIZE);

    for (let dy = -cellRadius; dy <= cellRadius; dy++) {
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        const cellX = centerCellX + dx;
        const cellY = centerCellY + dy;
        const cellPos = {
          x: cellX * this.CELL_SIZE + this.CELL_SIZE / 2,
          y: cellY * this.CELL_SIZE + this.CELL_SIZE / 2,
        } as Vector2;

        if (distance(cellPos, center) <= radius) {
          cells.push(`${cellX},${cellY}`);
        }
      }
    }

    return cells;
  }

  /**
   * Get the set of explored biome keys
   */
  getExploredBiomes(): Set<string> {
    return this.exploredBiomes;
  }

  /**
   * Get the set of explored cell keys
   */
  getExploredCells(): Set<string> {
    return this.exploredCells;
  }

  /**
   * Reset exploration tracking (for new game)
   */
  reset(): void {
    this.exploredCells.clear();
    this.exploredBiomes.clear();
  }
}

