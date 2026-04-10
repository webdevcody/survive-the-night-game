import Vector2 from "@shared/util/vector2";
/**
 * Tracks which grid cells each AI player has explored
 * Uses a grid-based system to avoid re-exploring the same areas
 */
export declare class AIExplorationTracker {
    private exploredCells;
    private exploredBiomes;
    private readonly CELL_SIZE;
    private readonly BIOME_SIZE;
    private readonly TILE_SIZE;
    constructor();
    /**
     * Mark the current position as explored
     */
    markExplored(position: Vector2): void;
    /**
     * Check if a position has been explored
     */
    isExplored(position: Vector2): boolean;
    /**
     * Check if a biome has been explored
     */
    isBiomeExplored(biomeX: number, biomeY: number): boolean;
    /**
     * Get the exploration percentage of nearby cells
     * Returns a value between 0 and 1
     */
    getExplorationScore(center: Vector2, radius: number): number;
    /**
     * Get cell key for a position
     */
    private getCellKey;
    /**
     * Get biome key for a position
     */
    private getBiomeKey;
    /**
     * Get all cell keys within a radius
     */
    private getCellsInRadius;
    /**
     * Get the set of explored biome keys
     */
    getExploredBiomes(): Set<string>;
    /**
     * Get the set of explored cell keys
     */
    getExploredCells(): Set<string>;
    /**
     * Reset exploration tracking (for new game)
     */
    reset(): void;
}
