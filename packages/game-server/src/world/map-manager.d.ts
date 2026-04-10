import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Vector2 from "@/util/vector2";
import type { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";
import type { WorldMapQuestDefinition } from "../../../game-shared/src/map/quest-types";
export declare const BIOME_SIZE: 16;
export declare const MAP_SIZE: 16;
export declare class MapManager implements IMapManager {
    private groundLayer;
    private collidablesLayer;
    /** Spawn palette layer (0 none, 1 player, 2–6 zombies); only filled when world-map.json is applied. */
    private spawnLayer;
    /** Decal layer (e.g. campsite marker); only filled when world-map.json is applied. */
    private decalsLayer;
    /** Biome grid coords of the campsite (procedural: center; authored: from decals layer). */
    private campsiteBiomeX;
    private campsiteBiomeY;
    /** Tile coords (col, row) for the campsite fire entity — same as first campsite decal when authored. */
    private campsiteFireTileX;
    private campsiteFireTileY;
    /** True after a valid authored `world-map.json` was applied this `generateMap()`. */
    private authoredWorldMapApplied;
    /** Normalized dialogue NPC entries from the last applied authored map (tile row/col + message). */
    private authoredDialogueNpcs;
    /** Message decal entries aligned with `DECAL_TILE_MESSAGE` cells on the decals layer. */
    private authoredMessageDecals;
    private authoredQuests;
    private gameManagers?;
    private entityManager?;
    private farmBiomePosition?;
    private gasStationBiomePosition?;
    private cityBiomePosition?;
    private dockBiomePosition?;
    private shedBiomePosition?;
    private merchantBiomePositions;
    private carLocation?;
    private carEntity?;
    /** Non-null only while `generateMap()` runs — deterministic layout from MAP_SEED. */
    private mapGenRng;
    constructor();
    private mapRandom;
    setGameManagers(gameManagers: IGameManagers): void;
    getGameManagers(): IGameManagers;
    getEntityManager(): IEntityManager;
    getMap(): number[][];
    getMapData(): MapData;
    getAuthoredQuests(): readonly WorldMapQuestDefinition[];
    getQuestDefinition(id: string): WorldMapQuestDefinition | undefined;
    getGroundLayer(): number[][];
    getCollidablesLayer(): number[][];
    /**
     * Select all valid zombie spawn locations in the 8 forest biomes surrounding the campsite.
     * Returns all valid empty ground tile positions from all surrounding biomes.
     */
    private selectCampsiteSurroundingBiomeSpawnLocations;
    private selectZombieSpawnLocations;
    /**
     * Spawns a single zombie of the specified type at the given location.
     */
    private spawnZombieAtLocation;
    /**
     * Spawns zombies around the campsite using the same spawn location logic as normal waves.
     */
    spawnZombiesAroundCampsite(zombieType: "regular" | "fast" | "big" | "bat" | "spitter", count: number): void;
    generateEmptyMap(width: number, height: number): void;
    generateMap(): void;
    private generateSpatialGrid;
    private initializeMap;
    /**
     * Sets campsite biome from the first campsite decal (tile scan order).
     * Fire is placed on that decal tile; if no decal, uses map-center biome and legacy local (8,7).
     */
    private resolveCampsiteBiomeFromDecals;
    /** When world-map.json exists and is valid, copy into layers. */
    private applyAuthoredWorldMap;
    /**
     * Player join / respawn: authored map uses spawn layer id 1 with empty collidables (no campsite fallback).
     * Procedural maps use campsite then grass.
     */
    getPlayerSpawnPositionForMap(): Vector2;
    /**
     * Restore open-world join at a saved tile: must be in bounds, empty collidable, and not overlapping the car.
     */
    tryGetPositionForSavedTile(tileX: number, tileY: number): Vector2 | null;
    private getRandomSpawnLayerPlayerPosition;
    private seedOpenWorldZombieSpawnPointsFromAuthoredLayer;
    private seedItemSpawnPointsFromAuthoredLayer;
    private seedDialogueSurvivorNpcsFromAuthoredLayer;
    /** Procedural campsite: fire at legacy local tile (8,7) inside the biome. */
    private spawnCampsiteFireAtBiome;
    /** Tile indices: `tileX` = column, `tileY` = row (matches `groundLayer[tileY][tileX]`). */
    private spawnCampsiteFireAtTile;
    private spawnLightDecalEntitiesFromDecalsLayer;
    private spawnMessageDecalEntitiesFromDecalsLayer;
    /**
     * Checks if a biome position is adjacent to (within 1 tile of) the campsite
     * This is used to enforce a forest-only zone around the campsite
     */
    private isNearCampsite;
    /**
     * Checks if a biome position is adjacent to any special biome
     * This ensures there's always at least 1 forest biome between special biomes
     */
    private isAdjacentToSpecialBiome;
    /**
     * Generic utility method to select a random biome position
     * Excludes edges, center campsite, campsite neighbors, and any provided excluded positions
     * Also ensures special biomes are never adjacent to each other
     * @param excludedPositions - Array of positions that should be excluded from selection
     * @returns A random valid position, or undefined if no valid positions exist
     */
    private selectRandomBiomePosition;
    private selectRandomFarmBiomePosition;
    private selectRandomGasStationBiomePosition;
    private selectRandomCityBiomePosition;
    private selectRandomDockBiomePosition;
    private selectRandomShedBiomePosition;
    private fillMapWithBiomes;
    private createForestBoundaries;
    private spawnMerchants;
    private spawnDebugZombieIfEnabled;
    private spawnIdleZombies;
    private isOpenWorldMode;
    /**
     * Collects map tiles eligible for open-world fixture zombies (same rules as spawnIdleZombies).
     */
    private collectEligibleOpenWorldZombieTiles;
    private shuffleTileCoords;
    private pickTilesWithMinChebyshevSeparation;
    private seedOpenWorldZombieSpawnPoints;
    /**
     * Authored maps: same checks as fixture placement as player spawn markers — trust spawns layer +
     * collidables + entity overlap, without restricting to the four procedural grass tile IDs.
     */
    isAuthoredZombieFixtureSpawnValid(position: Vector2, checkEntities?: boolean, entitySize?: number): boolean;
    private spawnSurvivorsInBiome;
    /**
     * Spawn a single survivor in a random biome
     * @returns true if survivor was successfully spawned, false otherwise
     */
    spawnSurvivorInRandomBiome(): boolean;
    private spawnBiomeItems;
    private placeBiome;
    getRandomGrassPosition(): Vector2;
    /**
     * Get a random grass position on the map, excluding the campsite biome.
     * Used for Battle Royale mode where players should spawn spread throughout the map.
     */
    getRandomGrassPositionExcludingCampsite(): Vector2;
    /**
     * Check if a position is within a special biome (FARM, GAS_STATION, CITY, DOCK, SHED)
     * Survivors in these biomes are invincible to zombie attacks
     */
    isPositionInSpecialBiome(position: Vector2): boolean;
    /**
     * Gets the car entity. Since there's only ever 1 car, this uses a cache.
     */
    private getCarEntity;
    /**
     * Checks if a position overlaps with the car entity.
     * Car is 2 tiles wide (32px).
     */
    private doesPositionOverlapWithCar;
    getCarLocation(): Vector2 | null;
    /**
     * Clears the cached car entity and location.
     * Should be called when the car is destroyed/removed.
     */
    clearCarCache(): void;
    getRandomCampsitePosition(): Vector2 | null;
    /**
     * Checks if a specific position is a valid ground tile without collidables and without zombies.
     * @param position The position to check (in pixels)
     * @param checkEntities Whether to check for existing entities at the position (default: true)
     * @param entitySize Size of entity to check for collisions (default: TILE_SIZE)
     * @returns True if the position is valid for placement/spawning
     */
    isPositionValidForPlacement(position: Vector2, checkEntities?: boolean, entitySize?: number): boolean;
    /**
     * Gets valid spawn positions within a specific biome.
     * Checks for valid ground tiles, collidables, and existing zombies.
     * @param biomeX Biome X coordinate
     * @param biomeY Biome Y coordinate
     * @returns Array of Vector2 positions representing valid empty ground tiles in the biome
     */
    /**
     * Get the center world positions of biomes directly surrounding the campsite
     * Returns an array of Vector2 positions representing the center of each surrounding biome
     */
    getCampsiteSurroundingBiomeCenters(): Vector2[];
    getValidSpawnPositionsInBiome(biomeX: number, biomeY: number): Vector2[];
    /**
     * Finds a random valid spawn position within a radius range from a center point.
     * Checks for valid ground tiles, collidables, and existing zombies.
     * @param center Center position to search around
     * @param minRadius Minimum distance from center (in pixels)
     * @param maxRadius Maximum distance from center (in pixels)
     * @returns A random valid spawn position, or null if none found
     */
    findRandomValidSpawnPosition(center: Vector2, minRadius: number, maxRadius: number): Vector2 | null;
    /**
     * Returns a Set of positions that are valid ground tiles without collidables and without zombies.
     * Optionally filters by a center position and radius.
     * @param center Optional center position to filter positions around
     * @param radius Optional radius around center position (in pixels)
     * @returns Set of Vector2 positions representing valid empty ground tiles
     */
    getEmptyGroundTiles(center?: Vector2, radius?: number): Set<Vector2>;
    /**
     * Spawns a specified number of crates at random valid positions on the map.
     * Crates are placed on ground tiles without collidables.
     * @param count Number of crates to spawn (default: 4)
     */
    spawnCrates(count: number): void;
    /**
     * Spawns a single crate in a random biome with 10 items.
     * @returns true if crate was successfully spawned, false otherwise
     */
    spawnCrateInRandomBiome(): boolean;
}
