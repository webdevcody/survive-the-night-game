import { Tree } from "@/entities/items/tree";
import { Boundary } from "@/entities/environment/boundary";
import { Car } from "@/entities/environment/car";
import { Zombie } from "@/entities/enemies/zombie";
import { DEBUG_START_ZOMBIE } from "@shared/debug";
import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import { IEntity } from "@/entities/types";
import PoolManager from "@shared/util/pool-manager";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { BossZombie } from "@/entities/enemies/boss-zombie";
import { GameMaster } from "@/managers/game-master";
import { SpitterZombie } from "@/entities/enemies/spitter-zombie";
import { Merchant } from "@/entities/environment/merchant";
import {
  CAMPSITE,
  FOREST1,
  FOREST2,
  FOREST3,
  WATER,
  FARM,
  GAS_STATION,
  CITY,
  MERCHANT,
  FOREST4,
  DOCK,
  SHED,
} from "@/world/biomes";
import type { BiomeData } from "@/world/biomes/types";
import type { MapData } from "../../../game-shared/src/events/server-sent/events/map-event";
import { getConfig } from "@/config";
import { itemRegistry, weaponRegistry, resourceRegistry } from "@shared/entities";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { Crate } from "@/entities/items/crate";
import { CampsiteFire } from "@/entities/environment/campsite-fire";

export const BIOME_SIZE = 16;
export const MAP_SIZE = 9;

/**
 * Build spawn table dynamically from item, weapon, and resource registries
 * Items/weapons/resources with spawn.enabled === true will be included
 */
function buildSpawnTable(): Array<{ chance: number; entityType: string }> {
  const spawnTable: Array<{ chance: number; entityType: string }> = [];

  // Add items with spawn enabled
  itemRegistry.getAll().forEach((itemConfig) => {
    if (itemConfig.spawn?.enabled) {
      // Map item ID to EntityType (most match directly)
      const entityType = itemConfig.id;

      spawnTable.push({
        chance: itemConfig.spawn.chance,
        entityType,
      });
    }
  });

  // Add weapons with spawn enabled
  weaponRegistry.getAll().forEach((weaponConfig) => {
    if (weaponConfig.spawn?.enabled) {
      spawnTable.push({
        chance: weaponConfig.spawn.chance,
        entityType: weaponConfig.id,
      });
    }
  });

  // Add resources with spawn enabled
  resourceRegistry.getAll().forEach((resourceConfig) => {
    if (resourceConfig.spawn?.enabled) {
      spawnTable.push({
        chance: resourceConfig.spawn.chance,
        entityType: resourceConfig.id,
      });
    }
  });

  return spawnTable;
}

export class MapManager implements IMapManager {
  private groundLayer: number[][] = [];
  private collidablesLayer: number[][] = [];
  private gameManagers?: IGameManagers;
  private entityManager?: IEntityManager;
  private gameMaster?: GameMaster;
  private farmBiomePosition?: { x: number; y: number };
  private gasStationBiomePosition?: { x: number; y: number };
  private cityBiomePosition?: { x: number; y: number };
  private dockBiomePosition?: { x: number; y: number };
  private shedBiomePosition?: { x: number; y: number };
  private merchantBiomePositions: Array<{ x: number; y: number }> = [];
  private carLocation?: Vector2 | null;
  private carEntity?: IEntity | null;

  constructor() {}

  public setGameManagers(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.entityManager = gameManagers.getEntityManager();
    this.gameMaster = new GameMaster(gameManagers);
  }

  public getGameManagers(): IGameManagers {
    if (!this.gameManagers) {
      throw new Error("MapManager: GameManagers was not set");
    }
    return this.gameManagers;
  }

  public getEntityManager(): IEntityManager {
    if (!this.entityManager) {
      throw new Error("MapManager: EntityManager was not set");
    }
    return this.entityManager;
  }

  public getMap(): number[][] {
    // Legacy method - returns ground layer for backward compatibility
    return this.groundLayer;
  }

  public getMapData(): MapData {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    return {
      ground: this.groundLayer,
      collidables: this.collidablesLayer,
      biomePositions: {
        campsite: { x: centerBiomeX, y: centerBiomeY },
        farm: this.farmBiomePosition,
        gasStation: this.gasStationBiomePosition,
        city: this.cityBiomePosition,
        dock: this.dockBiomePosition,
        shed: this.shedBiomePosition,
        merchants: this.merchantBiomePositions,
      },
    };
  }

  public getGroundLayer(): number[][] {
    return this.groundLayer;
  }

  public getCollidablesLayer(): number[][] {
    return this.collidablesLayer;
  }

  public spawnZombies(waveNumber: number) {
    if (!this.gameMaster) {
      throw new Error("MapManager: GameMaster was not set");
    }

    const zombieDistribution = this.gameMaster.getNumberOfZombies(waveNumber);
    const zombiesToSpawn = zombieDistribution.total;

    console.log("Spawning zombies", zombiesToSpawn);

    const totalSize = BIOME_SIZE * MAP_SIZE;

    // Get campsite biome position (center biome)
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    // Get spawn locations in the 8 forest biomes surrounding the campsite
    const spawnLocations = this.selectCampsiteSurroundingBiomeSpawnLocations(
      centerBiomeX,
      centerBiomeY
    );

    if (spawnLocations.length === 0) {
      console.warn("No valid spawn locations found around campsite");
      return;
    }

    // Divide zombies across the spawn locations
    const numLocations = spawnLocations.length;
    const zombiesPerLocation = {
      regular: Math.floor(zombieDistribution.regular / numLocations),
      fast: Math.floor(zombieDistribution.fast / numLocations),
      big: Math.floor(zombieDistribution.big / numLocations),
      bat: Math.floor(zombieDistribution.bat / numLocations),
      spitter: Math.floor(zombieDistribution.spitter / numLocations),
    };

    // Handle remainder zombies (distribute to first location)
    const remainderZombies = {
      regular: zombieDistribution.regular % numLocations,
      fast: zombieDistribution.fast % numLocations,
      big: zombieDistribution.big % numLocations,
      bat: zombieDistribution.bat % numLocations,
      spitter: zombieDistribution.spitter % numLocations,
    };

    // Spawn zombies at each location
    spawnLocations.forEach((location, index) => {
      const isFirstLocation = index === 0;

      const locationDistribution = {
        regular: zombiesPerLocation.regular + (isFirstLocation ? remainderZombies.regular : 0),
        fast: zombiesPerLocation.fast + (isFirstLocation ? remainderZombies.fast : 0),
        big: zombiesPerLocation.big + (isFirstLocation ? remainderZombies.big : 0),
        bat: zombiesPerLocation.bat + (isFirstLocation ? remainderZombies.bat : 0),
        spitter: zombiesPerLocation.spitter + (isFirstLocation ? remainderZombies.spitter : 0),
      };

      this.spawnZombieGroupAtLocation(location, locationDistribution, totalSize);
    });

    this.spawnBossIfNeeded(waveNumber, spawnLocations);
  }

  /**
   * Select zombie spawn locations in the 8 forest biomes surrounding the campsite.
   * For each biome, picks a random valid ground tile as a spawn location.
   */
  private selectCampsiteSurroundingBiomeSpawnLocations(
    campsiteBiomeX: number,
    campsiteBiomeY: number
  ): Array<{ x: number; y: number }> {
    const spawnLocations: Array<{ x: number; y: number }> = [];

    // Get the 8 surrounding biomes (3x3 grid minus the center campsite)
    const surroundingBiomes: Array<{ biomeX: number; biomeY: number }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        // Skip the center campsite biome itself
        if (dx === 0 && dy === 0) {
          continue;
        }

        const biomeX = campsiteBiomeX + dx;
        const biomeY = campsiteBiomeY + dy;

        // Ensure biome is within map bounds
        if (biomeX >= 0 && biomeX < MAP_SIZE && biomeY >= 0 && biomeY < MAP_SIZE) {
          surroundingBiomes.push({ biomeX, biomeY });
        }
      }
    }

    // For each surrounding biome, find valid ground tiles and pick one randomly
    for (const { biomeX, biomeY } of surroundingBiomes) {
      const validPositions: Array<{ x: number; y: number }> = [];

      // Collect all valid spawn positions within this biome
      for (let y = 0; y < BIOME_SIZE; y++) {
        for (let x = 0; x < BIOME_SIZE; x++) {
          const mapY = biomeY * BIOME_SIZE + y;
          const mapX = biomeX * BIOME_SIZE + x;
          const groundTile = this.groundLayer[mapY]?.[mapX];
          const isValidGround =
            groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

          if (isValidGround && this.collidablesLayer[mapY]?.[mapX] === -1) {
            // Convert tile coordinates to pixel coordinates
            validPositions.push({
              x: mapX * getConfig().world.TILE_SIZE,
              y: mapY * getConfig().world.TILE_SIZE,
            });
          }
        }
      }

      // Pick a random valid position from this biome
      if (validPositions.length > 0) {
        const randomIndex = Math.floor(Math.random() * validPositions.length);
        spawnLocations.push(validPositions[randomIndex]);
      }
    }

    return spawnLocations;
  }

  private selectZombieSpawnLocations(
    count: number,
    centerBiomeX: number,
    centerBiomeY: number
  ): Array<{ biomeX: number; biomeY: number }> {
    const validBiomes: Array<{ biomeX: number; biomeY: number }> = [];

    // Collect all valid biomes on the outskirts (not center, not water edges)
    for (let biomeY = 1; biomeY < MAP_SIZE - 1; biomeY++) {
      for (let biomeX = 1; biomeX < MAP_SIZE - 1; biomeX++) {
        // Skip the center campsite biome and adjacent biomes
        if (this.isNearCampsite(biomeX, biomeY)) {
          continue;
        }

        validBiomes.push({ biomeX, biomeY });
      }
    }

    // Randomly select spawn locations
    const selectedLocations: Array<{ biomeX: number; biomeY: number }> = [];
    for (let i = 0; i < count && validBiomes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * validBiomes.length);
      selectedLocations.push(validBiomes[randomIndex]);
      validBiomes.splice(randomIndex, 1); // Remove selected biome to avoid duplicates
    }

    return selectedLocations;
  }

  private spawnZombieGroupAtLocation(
    location: { x?: number; y?: number; biomeX?: number; biomeY?: number },
    distribution: {
      regular: number;
      fast: number;
      big: number;
      bat: number;
      spitter: number;
    },
    totalSize: number
  ) {
    let spawnedCount = {
      regular: 0,
      fast: 0,
      big: 0,
      bat: 0,
      spitter: 0,
    };

    const totalZombies =
      distribution.regular +
      distribution.fast +
      distribution.big +
      distribution.bat +
      distribution.spitter;

    // Support both pixel coordinates (x, y) and biome coordinates (biomeX, biomeY)
    let centerTileX: number;
    let centerTileY: number;

    if (location.x !== undefined && location.y !== undefined) {
      // Convert pixel coordinates to tile coordinates
      centerTileX = Math.floor(location.x / getConfig().world.TILE_SIZE);
      centerTileY = Math.floor(location.y / getConfig().world.TILE_SIZE);
    } else if (location.biomeX !== undefined && location.biomeY !== undefined) {
      // Use biome coordinates
      centerTileX = location.biomeX * BIOME_SIZE + Math.floor(BIOME_SIZE / 2);
      centerTileY = location.biomeY * BIOME_SIZE + Math.floor(BIOME_SIZE / 2);
    } else {
      throw new Error("Invalid location: must provide either (x, y) or (biomeX, biomeY)");
    }

    // Create a spawn area around the center point (8x8 tiles)
    const SPAWN_RADIUS_TILES = 4;
    const spawnAreaStartX = Math.max(0, centerTileX - SPAWN_RADIUS_TILES);
    const spawnAreaStartY = Math.max(0, centerTileY - SPAWN_RADIUS_TILES);
    const spawnAreaEndX = Math.min(totalSize, centerTileX + SPAWN_RADIUS_TILES);
    const spawnAreaEndY = Math.min(totalSize, centerTileY + SPAWN_RADIUS_TILES);

    // Track occupied positions to prevent spawning on top of each other
    const occupiedPositions = new Set<string>();

    let attempts = 0;
    const maxAttempts = totalZombies * 20; // Increased attempts for better spreading

    while (
      spawnedCount.regular < distribution.regular ||
      spawnedCount.fast < distribution.fast ||
      spawnedCount.big < distribution.big ||
      spawnedCount.bat < distribution.bat ||
      spawnedCount.spitter < distribution.spitter
    ) {
      if (attempts++ > maxAttempts) {
        const locStr =
          location.x !== undefined
            ? `(${location.x}, ${location.y})`
            : `biome (${location.biomeX}, ${location.biomeY})`;
        console.warn(`Could not spawn all zombies at location ${locStr}`);
        break;
      }

      // Random position within the spawn area
      const x = Math.floor(Math.random() * (spawnAreaEndX - spawnAreaStartX)) + spawnAreaStartX;
      const y = Math.floor(Math.random() * (spawnAreaEndY - spawnAreaStartY)) + spawnAreaStartY;

      // Check if position is already occupied
      const posKey = `${x},${y}`;
      if (occupiedPositions.has(posKey)) {
        continue;
      }

      // Skip if not on valid ground tile
      const groundTile = this.groundLayer[y]?.[x];
      const isValidGround =
        groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;
      const hasCollidable = this.collidablesLayer[y]?.[x] !== -1;

      if (!isValidGround || hasCollidable) {
        continue;
      }

      // Mark position as occupied
      occupiedPositions.add(posKey);

      // Determine which type of zombie to spawn based on remaining counts
      if (spawnedCount.bat < distribution.bat) {
        const zombie = new BatZombie(this.getGameManagers());
        zombie.setPosition(
          PoolManager.getInstance().vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          )
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.bat++;
      } else if (spawnedCount.big < distribution.big) {
        const zombie = new BigZombie(this.getGameManagers());
        zombie.setPosition(
          PoolManager.getInstance().vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          )
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.big++;
      } else if (spawnedCount.fast < distribution.fast) {
        const zombie = new FastZombie(this.getGameManagers());
        zombie.setPosition(
          PoolManager.getInstance().vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          )
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.fast++;
      } else if (spawnedCount.regular < distribution.regular) {
        const zombie = new Zombie(this.getGameManagers());
        zombie.setPosition(
          PoolManager.getInstance().vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          )
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.regular++;
      } else if (spawnedCount.spitter < distribution.spitter) {
        const zombie = new SpitterZombie(this.getGameManagers());
        zombie.setPosition(
          PoolManager.getInstance().vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          )
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.spitter++;
      }
    }
  }

  private spawnBossIfNeeded(
    waveNumber: number,
    spawnLocations: Array<{ x: number; y: number }>
  ): void {
    const bossWaveMapping = getConfig().wave.BOSS_WAVE_MAPPING as Record<number, string>;
    const bossType = bossWaveMapping[waveNumber];

    if (!bossType) {
      return;
    }

    // Don't spawn if a boss is already active
    if (this.isBossActive()) {
      return;
    }

    const spawnPoint = spawnLocations[0] ?? this.getFallbackBossSpawnLocation();
    this.spawnBossAt(spawnPoint, bossType);
  }

  private isBossActive(): boolean {
    return this.getEntityManager().getEntitiesByType(Entities.BOSS_ZOMBIE).length > 0;
  }

  private getFallbackBossSpawnLocation(): { x: number; y: number } {
    const tileSize = getConfig().world.TILE_SIZE;
    const totalTiles = BIOME_SIZE * MAP_SIZE;
    const centerTile = Math.floor(totalTiles / 2);
    return {
      x: centerTile * tileSize,
      y: centerTile * tileSize,
    };
  }

  private spawnBossAt(position: { x: number; y: number }, bossType: string): void {
    const boss = this.getEntityManager().createEntity(bossType as any);
    if (!boss) {
      console.warn(`Failed to spawn boss of type: ${bossType}`);
      return;
    }
    if (!boss.hasExt(Positionable)) {
      console.warn(`Boss entity ${bossType} does not have Positionable extension`);
      return;
    }
    boss
      .getExt(Positionable)
      .setPosition(PoolManager.getInstance().vector2.claim(position.x, position.y));
    this.getEntityManager().addEntity(boss);
  }

  generateEmptyMap(width: number, height: number) {
    this.getEntityManager().clear();
    this.getEntityManager().setMapSize(
      width * getConfig().world.TILE_SIZE,
      height * getConfig().world.TILE_SIZE
    );
    this.groundLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    this.collidablesLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(-1));
    this.carLocation = null;
    this.carEntity = null;
  }

  generateMap() {
    this.getEntityManager().clear();
    this.carLocation = null;
    this.carEntity = null;
    this.generateSpatialGrid();
    this.initializeMap();
    this.selectRandomFarmBiomePosition();
    this.selectRandomGasStationBiomePosition();
    this.selectRandomCityBiomePosition();
    this.selectRandomDockBiomePosition();
    this.selectRandomShedBiomePosition();
    this.selectRandomMerchantBiomePositions();
    this.fillMapWithBiomes();
    this.createForestBoundaries();
    this.spawnMerchants();
    this.spawnItems();
    this.spawnIdleZombies();
    this.spawnDebugZombieIfEnabled();
  }

  private generateSpatialGrid() {
    this.getEntityManager().setMapSize(
      BIOME_SIZE * MAP_SIZE * getConfig().world.TILE_SIZE,
      BIOME_SIZE * MAP_SIZE * getConfig().world.TILE_SIZE
    );
  }

  private initializeMap() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    this.groundLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));
    this.collidablesLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(-1));
  }

  /**
   * Checks if a biome position is adjacent to (within 1 tile of) the campsite
   * This is used to enforce a forest-only zone around the campsite
   */
  private isNearCampsite(biomeX: number, biomeY: number): boolean {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const distance = Math.abs(biomeX - centerBiomeX) + Math.abs(biomeY - centerBiomeY);
    return distance <= 1;
  }

  /**
   * Checks if a biome position is adjacent to any special biome
   * This ensures there's always at least 1 forest biome between special biomes
   */
  private isAdjacentToSpecialBiome(
    biomeX: number,
    biomeY: number,
    specialBiomes: Array<{ x: number; y: number } | undefined>
  ): boolean {
    // Check all 8 adjacent positions (cardinal + diagonal)
    const adjacentOffsets = [
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: 0 }, // right
      { dx: 0, dy: -1 }, // up
      { dx: 0, dy: 1 }, // down
      { dx: -1, dy: -1 }, // top-left
      { dx: 1, dy: -1 }, // top-right
      { dx: -1, dy: 1 }, // bottom-left
      { dx: 1, dy: 1 }, // bottom-right
    ];

    return adjacentOffsets.some(({ dx, dy }) => {
      const checkX = biomeX + dx;
      const checkY = biomeY + dy;
      return specialBiomes.some((pos) => pos && pos.x === checkX && pos.y === checkY);
    });
  }

  /**
   * Generic utility method to select a random biome position
   * Excludes edges, center campsite, campsite neighbors, and any provided excluded positions
   * Also ensures special biomes are never adjacent to each other
   * @param excludedPositions - Array of positions that should be excluded from selection
   * @returns A random valid position, or undefined if no valid positions exist
   */
  private selectRandomBiomePosition(
    excludedPositions: Array<{ x: number; y: number } | undefined>
  ): { x: number; y: number } | undefined {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const validPositions: { x: number; y: number }[] = [];

    // Collect all valid biome positions (not edges, not center, not near campsite, not excluded, not adjacent to special biomes)
    for (let biomeY = 1; biomeY < MAP_SIZE - 1; biomeY++) {
      for (let biomeX = 1; biomeX < MAP_SIZE - 1; biomeX++) {
        // Skip the center campsite biome
        if (biomeX === centerBiomeX && biomeY === centerBiomeY) {
          continue;
        }

        // Skip positions near the campsite (enforce forest-only zone)
        if (this.isNearCampsite(biomeX, biomeY)) {
          continue;
        }

        // Skip any excluded positions
        const isExcluded = excludedPositions.some(
          (pos) => pos && pos.x === biomeX && pos.y === biomeY
        );
        if (isExcluded) {
          continue;
        }

        // Skip positions adjacent to any already-placed special biomes
        if (this.isAdjacentToSpecialBiome(biomeX, biomeY, excludedPositions)) {
          continue;
        }

        validPositions.push({ x: biomeX, y: biomeY });
      }
    }

    // Select a random position from valid positions
    if (validPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * validPositions.length);
      return validPositions[randomIndex];
    }

    return undefined;
  }

  private selectRandomFarmBiomePosition() {
    this.farmBiomePosition = this.selectRandomBiomePosition([]);
  }

  private selectRandomGasStationBiomePosition() {
    this.gasStationBiomePosition = this.selectRandomBiomePosition([this.farmBiomePosition]);
  }

  private selectRandomCityBiomePosition() {
    this.cityBiomePosition = this.selectRandomBiomePosition([
      this.farmBiomePosition,
      this.gasStationBiomePosition,
    ]);
  }

  private selectRandomDockBiomePosition() {
    this.dockBiomePosition = this.selectRandomBiomePosition([
      this.farmBiomePosition,
      this.gasStationBiomePosition,
      this.cityBiomePosition,
    ]);
  }

  private selectRandomShedBiomePosition() {
    this.shedBiomePosition = this.selectRandomBiomePosition([
      this.farmBiomePosition,
      this.gasStationBiomePosition,
      this.cityBiomePosition,
      this.dockBiomePosition,
    ]);
  }

  private selectRandomMerchantBiomePositions() {
    // Clear any previous merchant positions
    this.merchantBiomePositions = [];

    // Spawn 2 merchant biomes
    for (let i = 0; i < 2; i++) {
      const position = this.selectRandomBiomePosition([
        this.farmBiomePosition,
        this.gasStationBiomePosition,
        this.cityBiomePosition,
        this.dockBiomePosition,
        this.shedBiomePosition,
        ...this.merchantBiomePositions,
      ]);

      if (position) {
        this.merchantBiomePositions.push(position);
      }
    }
  }

  private fillMapWithBiomes() {
    for (let biomeY = 0; biomeY < MAP_SIZE; biomeY++) {
      for (let biomeX = 0; biomeX < MAP_SIZE; biomeX++) {
        this.placeBiome(biomeX, biomeY);
      }
    }
  }

  private createForestBoundaries() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const carTiles = new Set([265, 266]);
    let carSpawned = false;

    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check collidables layer for any non-empty tile
        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId !== -1) {
          // Check if this is a car tile (265 or 266)
          if (carTiles.has(collidableTileId) && !carSpawned) {
            // TODO: this is hacky for sure
            // Spawn the car entity at tile 265 (left side of car)
            const car = new Car(this.getGameManagers());
            const carPosition = PoolManager.getInstance().vector2.claim(
              x * getConfig().world.TILE_SIZE,
              y * getConfig().world.TILE_SIZE
            );
            car.getExt(Positionable).setPosition(carPosition);
            this.getEntityManager().addEntity(car);
            // Cache the car entity and location for fast lookup
            this.carEntity = car;
            this.carLocation = car.getExt(Positionable).getCenterPosition();
            carSpawned = true;

            // Clear the car tiles from collidables layer so pathfinding works
            // Car is 2 tiles wide (265, 266), so clear both tiles
            this.collidablesLayer[y][x] = -1;
            if (x + 1 < totalSize) {
              this.collidablesLayer[y][x + 1] = -1;
            }
          } else if (!carTiles.has(collidableTileId)) {
            // Spawn regular boundary for non-car tiles
            const boundary = new Boundary(this.getGameManagers());
            boundary.setPosition(
              PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE
              )
            );
            this.getEntityManager().addEntity(boundary);
          }
        }
      }
    }
  }

  private spawnMerchants() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check collidables layer for merchant tile (255)
        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId === 255) {
          const merchant = new Merchant(this.getGameManagers());
          merchant.setPosition(
            PoolManager.getInstance().vector2.claim(
              x * getConfig().world.TILE_SIZE,
              y * getConfig().world.TILE_SIZE
            )
          );
          this.getEntityManager().addEntity(merchant);
        }
      }
    }
  }

  private spawnItems() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check ground layer for valid ground tiles (8, 4, 14, 24) and ensure no collidable is blocking
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
          this.trySpawnItemAt(x, y);
        }
      }
    }
  }

  private trySpawnItemAt(x: number, y: number) {
    const spawnTable = buildSpawnTable();
    const random = Math.random();
    let cumulativeChance = 0;

    for (const { chance, entityType } of spawnTable) {
      cumulativeChance += chance;
      if (random < cumulativeChance) {
        const entity = this.getEntityManager().createEntity(entityType as any);
        if (entity) {
          entity
            .getExt(Positionable)
            .setPosition(
              PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE
              )
            );
          this.getEntityManager().addEntity(entity);
        }
        break;
      }
    }
  }

  private spawnDebugZombieIfEnabled() {
    if (DEBUG_START_ZOMBIE) {
      const totalSize = BIOME_SIZE * MAP_SIZE;
      const middleX = Math.floor(totalSize / 2) * getConfig().world.TILE_SIZE;
      const middleY = Math.floor(totalSize / 2) * getConfig().world.TILE_SIZE;

      const zombie = new Zombie(this.getGameManagers());
      const poolManager = PoolManager.getInstance();
      zombie.setPosition(
        poolManager.vector2.claim(middleX + 16 * 4 * getConfig().world.TILE_SIZE, middleY)
      );
      this.getEntityManager().addEntity(zombie);
    }
  }

  private spawnIdleZombies() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const IDLE_ZOMBIE_SPAWN_CHANCE = 0.01; // 0.5% chance per valid tile

    // Calculate campsite biome bounds (center biome)
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const campsiteMinX = centerBiomeX * BIOME_SIZE;
    const campsiteMaxX = (centerBiomeX + 1) * BIOME_SIZE;
    const campsiteMinY = centerBiomeY * BIOME_SIZE;
    const campsiteMaxY = (centerBiomeY + 1) * BIOME_SIZE;

    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Skip campsite biome tiles
        if (x >= campsiteMinX && x < campsiteMaxX && y >= campsiteMinY && y < campsiteMaxY) {
          continue;
        }

        if (this.collidablesLayer[y][x] === -1) {
          if (Math.random() < IDLE_ZOMBIE_SPAWN_CHANCE) {
            const zombie = new Zombie(this.getGameManagers(), true); // true = idle mode
            zombie.setPosition(
              PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE
              )
            );
            this.getEntityManager().addEntity(zombie);
          }
        }
      }
    }
  }

  private spawnSurvivorsInBiome(biomeX: number, biomeY: number): void {
    // Spawn 1-2 survivors randomly
    const survivorCount = Math.random() < 0.5 ? 1 : 2;

    // Collect all valid spawn positions within this biome
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === -1) {
          validPositions.push({ x: mapX, y: mapY });
        }
      }
    }

    // Spawn survivors
    for (let i = 0; i < survivorCount; i++) {
      if (validPositions.length === 0) {
        console.warn(`No valid positions to spawn survivor in biome at (${biomeX}, ${biomeY})`);
        break;
      }

      const entity = this.getEntityManager().createEntity(Entities.SURVIVOR);
      if (!entity) {
        console.warn(`Failed to create survivor entity`);
        continue;
      }

      // Pick a random position from valid positions
      const randomIndex = Math.floor(Math.random() * validPositions.length);
      const position = validPositions[randomIndex];
      // Remove used position to avoid overlapping survivors
      validPositions.splice(randomIndex, 1);

      entity
        .getExt(Positionable)
        .setPosition(
          PoolManager.getInstance().vector2.claim(
            position.x * getConfig().world.TILE_SIZE,
            position.y * getConfig().world.TILE_SIZE
          )
        );
      this.getEntityManager().addEntity(entity);
    }
  }

  private spawnBiomeItems(biome: BiomeData, biomeX: number, biomeY: number) {
    if (!biome.items || biome.items.length === 0) {
      return;
    }

    // Collect all valid spawn positions within this biome
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === -1) {
          validPositions.push({ x: mapX, y: mapY });
        }
      }
    }

    // Spawn each item at a random position within the biome
    for (const entityType of biome.items) {
      const entity = this.getEntityManager().createEntity(entityType);
      if (!entity) {
        console.warn(`Failed to create entity type in biome: ${entityType}`);
        continue;
      }

      if (validPositions.length === 0) {
        console.warn(`No valid positions to spawn ${entityType} in biome`);
        continue;
      }

      // Pick a random position from valid positions
      const randomIndex = Math.floor(Math.random() * validPositions.length);
      const position = validPositions[randomIndex];

      entity
        .getExt(Positionable)
        .setPosition(
          PoolManager.getInstance().vector2.claim(
            position.x * getConfig().world.TILE_SIZE,
            position.y * getConfig().world.TILE_SIZE
          )
        );
      this.getEntityManager().addEntity(entity);
    }
  }

  private placeBiome(biomeX: number, biomeY: number) {
    // Place water biomes around the outer edges
    if (biomeX === 0 || biomeX === MAP_SIZE - 1 || biomeY === 0 || biomeY === MAP_SIZE - 1) {
      for (let y = 0; y < BIOME_SIZE; y++) {
        for (let x = 0; x < BIOME_SIZE; x++) {
          const mapY = biomeY * BIOME_SIZE + y;
          const mapX = biomeX * BIOME_SIZE + x;
          this.groundLayer[mapY][mapX] = WATER.ground[y][x];
          this.collidablesLayer[mapY][mapX] = WATER.collidables[y][x];
        }
      }
      this.spawnBiomeItems(WATER, biomeX, biomeY);
      return;
    }

    // Determine which biome to place
    let biome: BiomeData;
    if (biomeX === Math.floor(MAP_SIZE / 2) && biomeY === Math.floor(MAP_SIZE / 2)) {
      // Place campsite at center (3,3)
      biome = CAMPSITE;
    } else if (
      this.farmBiomePosition &&
      biomeX === this.farmBiomePosition.x &&
      biomeY === this.farmBiomePosition.y
    ) {
      // Place farm at the randomly selected position
      biome = FARM;
    } else if (
      this.gasStationBiomePosition &&
      biomeX === this.gasStationBiomePosition.x &&
      biomeY === this.gasStationBiomePosition.y
    ) {
      // Place gas station at the randomly selected position
      biome = GAS_STATION;
    } else if (
      this.cityBiomePosition &&
      biomeX === this.cityBiomePosition.x &&
      biomeY === this.cityBiomePosition.y
    ) {
      // Place city at the randomly selected position
      biome = CITY;
    } else if (
      this.dockBiomePosition &&
      biomeX === this.dockBiomePosition.x &&
      biomeY === this.dockBiomePosition.y
    ) {
      // Place dock at the randomly selected position
      biome = DOCK;
    } else if (
      this.shedBiomePosition &&
      biomeX === this.shedBiomePosition.x &&
      biomeY === this.shedBiomePosition.y
    ) {
      // Place shed at the randomly selected position
      biome = SHED;
    } else if (this.merchantBiomePositions.some((pos) => biomeX === pos.x && biomeY === pos.y)) {
      // Place merchant at the randomly selected positions
      biome = MERCHANT;
    } else {
      // Place forest everywhere else
      const forestBiomes = [FOREST1, FOREST2, FOREST3, FOREST4];
      biome = forestBiomes[Math.floor(Math.random() * forestBiomes.length)];
    }

    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        this.groundLayer[mapY][mapX] = biome.ground[y][x];
        this.collidablesLayer[mapY][mapX] = biome.collidables[y][x];
      }
    }

    // Hard-code campfire entity spawn for campsite biome
    // Campfire position: x=8, y=7 within the biome (center of campsite)
    if (biome === CAMPSITE) {
      const campfireLocalX = 8;
      const campfireLocalY = 7;
      const absoluteX = biomeX * BIOME_SIZE + campfireLocalX;
      const absoluteY = biomeY * BIOME_SIZE + campfireLocalY;

      const campsiteFire = new CampsiteFire(this.getGameManagers());
      campsiteFire
        .getExt(Positionable)
        .setPosition(
          PoolManager.getInstance().vector2.claim(
            absoluteX * getConfig().world.TILE_SIZE,
            absoluteY * getConfig().world.TILE_SIZE
          )
        );
      this.getEntityManager().addEntity(campsiteFire);
    }

    this.spawnBiomeItems(biome, biomeX, biomeY);

    // Spawn survivors in special biomes
    if (
      biome === FARM ||
      biome === GAS_STATION ||
      biome === CITY ||
      biome === DOCK ||
      biome === SHED
    ) {
      this.spawnSurvivorsInBiome(biomeX, biomeY);
    }
  }

  public getRandomGrassPosition(): Vector2 {
    // Try to get a campsite position first
    const campsitePosition = this.getRandomCampsitePosition();
    if (campsitePosition) {
      return campsitePosition;
    }

    // Fall back to any grass position if campsite position not found
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const validPositions: Vector2[] = [];

    // Collect all valid ground tile positions (8, 4, 14, 24 are grass/ground tiles)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
          const poolManager = PoolManager.getInstance();
          const position = poolManager.vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE
          );

          // Check if this position overlaps with the car
          if (!this.doesPositionOverlapWithCar(position)) {
            validPositions.push(position);
          }
        }
      }
    }

    if (validPositions.length === 0) {
      // Fallback to center if no grass tiles found
      const poolManager = PoolManager.getInstance();
      return poolManager.vector2.claim(
        (totalSize * getConfig().world.TILE_SIZE) / 2,
        (totalSize * getConfig().world.TILE_SIZE) / 2
      );
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  /**
   * Check if a position is within a special biome (FARM, GAS_STATION, CITY, DOCK, SHED)
   * Survivors in these biomes are invincible to zombie attacks
   */
  public isPositionInSpecialBiome(position: Vector2): boolean {
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const tileX = Math.floor(position.x / TILE_SIZE);
    const tileY = Math.floor(position.y / TILE_SIZE);
    const biomeX = Math.floor(tileX / BIOME_SIZE);
    const biomeY = Math.floor(tileY / BIOME_SIZE);

    // Check if position is in any special biome
    if (
      this.farmBiomePosition &&
      biomeX === this.farmBiomePosition.x &&
      biomeY === this.farmBiomePosition.y
    ) {
      return true;
    }
    if (
      this.gasStationBiomePosition &&
      biomeX === this.gasStationBiomePosition.x &&
      biomeY === this.gasStationBiomePosition.y
    ) {
      return true;
    }
    if (
      this.cityBiomePosition &&
      biomeX === this.cityBiomePosition.x &&
      biomeY === this.cityBiomePosition.y
    ) {
      return true;
    }
    if (
      this.dockBiomePosition &&
      biomeX === this.dockBiomePosition.x &&
      biomeY === this.dockBiomePosition.y
    ) {
      return true;
    }
    if (
      this.shedBiomePosition &&
      biomeX === this.shedBiomePosition.x &&
      biomeY === this.shedBiomePosition.y
    ) {
      return true;
    }
    return false;
  }

  /**
   * Gets the car entity. Since there's only ever 1 car, this uses a cache.
   */
  private getCarEntity(): IEntity | null {
    // Return cached car entity if available
    if (this.carEntity !== undefined) {
      return this.carEntity;
    }

    // Fallback: search for car entity if cache is not set (shouldn't happen after map load)
    const entities = this.getEntityManager().getEntities();
    for (const entity of entities) {
      if (entity.getType() === "car") {
        this.carEntity = entity;
        return entity;
      }
    }

    this.carEntity = null;
    return null;
  }

  /**
   * Checks if a position overlaps with the car entity.
   * Car is 2 tiles wide (32px).
   */
  private doesPositionOverlapWithCar(position: Vector2): boolean {
    const car = this.getCarEntity();
    if (!car || !car.hasExt(Positionable)) {
      return false;
    }

    const carPos = car.getExt(Positionable).getPosition();
    // Car is 2 tiles wide (32px), check if position is within car bounds
    return (
      position.x >= carPos.x &&
      position.x < carPos.x + getConfig().world.TILE_SIZE * 2 &&
      position.y >= carPos.y &&
      position.y < carPos.y + getConfig().world.TILE_SIZE
    );
  }

  public getCarLocation(): Vector2 | null {
    // Return cached car location if available
    if (this.carLocation !== undefined) {
      return this.carLocation;
    }

    // Fallback: search for car entity if cache is not set (shouldn't happen after map load)
    const car = this.getCarEntity();
    if (car && car.hasExt(Positionable)) {
      this.carLocation = car.getExt(Positionable).getCenterPosition();
      return this.carLocation;
    }

    this.carLocation = null;
    return null;
  }

  public getRandomCampsitePosition(): Vector2 | null {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const validPositions: Vector2[] = [];

    // Iterate through the campsite biome tiles
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = centerBiomeY * BIOME_SIZE + y;
        const mapX = centerBiomeX * BIOME_SIZE + x;
        // Check if it's a valid ground tile (8, 4, 14, 24) and no collidable blocking
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === -1) {
          const poolManager = PoolManager.getInstance();
          const position = poolManager.vector2.claim(
            mapX * getConfig().world.TILE_SIZE,
            mapY * getConfig().world.TILE_SIZE
          );

          // Check if this position overlaps with the car
          if (!this.doesPositionOverlapWithCar(position)) {
            validPositions.push(position);
          }
        }
      }
    }

    if (validPositions.length === 0) {
      return null;
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  /**
   * Checks if a specific position is a valid ground tile without collidables and without zombies.
   * @param position The position to check (in pixels)
   * @param checkEntities Whether to check for existing entities at the position (default: true)
   * @param entitySize Size of entity to check for collisions (default: TILE_SIZE)
   * @returns True if the position is valid for placement/spawning
   */
  public isPositionValidForPlacement(
    position: Vector2,
    checkEntities: boolean = true,
    entitySize?: number
  ): boolean {
    const { TILE_SIZE } = getConfig().world;
    const size = entitySize ?? TILE_SIZE;
    const gridX = Math.floor(position.x / TILE_SIZE);
    const gridY = Math.floor(position.y / TILE_SIZE);
    const totalSize = BIOME_SIZE * MAP_SIZE;

    // Check bounds
    if (gridY < 0 || gridY >= totalSize || gridX < 0 || gridX >= totalSize) {
      return false;
    }

    // Check if it's a valid ground tile
    const groundTile = this.groundLayer[gridY]?.[gridX];
    const isValidGround =
      groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

    if (!isValidGround) {
      return false;
    }

    // Check if there's a collidable
    if (this.collidablesLayer[gridY]?.[gridX] !== -1) {
      return false;
    }

    // Check if there are any entities at this position
    if (checkEntities) {
      const poolManager = PoolManager.getInstance();
      const positionCenter = poolManager.vector2.claim(
        position.x + size / 2,
        position.y + size / 2
      );
      const nearbyEntities = this.getEntityManager().getNearbyEntities(positionCenter, size);

      for (const entity of nearbyEntities) {
        if (!entity.hasExt(Positionable)) continue;

        const entityPos = entity.getExt(Positionable).getCenterPosition();
        const dx = Math.abs(entityPos.x - positionCenter.x);
        const dy = Math.abs(entityPos.y - positionCenter.y);

        if (dx < size && dy < size) {
          poolManager.vector2.release(positionCenter);
          return false;
        }
      }

      poolManager.vector2.release(positionCenter);
    }

    return true;
  }

  /**
   * Returns a Set of positions that are valid ground tiles without collidables and without zombies.
   * Optionally filters by a center position and radius.
   * @param center Optional center position to filter positions around
   * @param radius Optional radius around center position (in pixels)
   * @returns Set of Vector2 positions representing valid empty ground tiles
   */
  public getEmptyGroundTiles(center?: Vector2, radius?: number): Set<Vector2> {
    const { TILE_SIZE } = getConfig().world;
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const validPositions = new Set<Vector2>();
    const poolManager = PoolManager.getInstance();
    const zombieTypes = getZombieTypesSet();

    // Calculate bounds if center and radius are provided
    let minTileX = 0;
    let maxTileX = totalSize;
    let minTileY = 0;
    let maxTileY = totalSize;

    if (center && radius !== undefined) {
      const centerTileX = Math.floor(center.x / TILE_SIZE);
      const centerTileY = Math.floor(center.y / TILE_SIZE);
      const radiusTiles = Math.ceil(radius / TILE_SIZE);
      minTileX = Math.max(0, centerTileX - radiusTiles);
      maxTileX = Math.min(totalSize, centerTileX + radiusTiles);
      minTileY = Math.max(0, centerTileY - radiusTiles);
      maxTileY = Math.min(totalSize, centerTileY + radiusTiles);
    }

    // Iterate through tiles in the specified bounds
    for (let y = minTileY; y < maxTileY; y++) {
      for (let x = minTileX; x < maxTileX; x++) {
        // Check if it's a valid ground tile
        const groundTile = this.groundLayer[y]?.[x];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (!isValidGround) {
          continue;
        }

        // Check if there's a collidable
        if (this.collidablesLayer[y]?.[x] !== -1) {
          continue;
        }

        // Convert tile coordinates to pixel coordinates
        const position = poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE);

        // If center and radius are provided, check distance
        if (center && radius !== undefined) {
          const centerPos = poolManager.vector2.claim(
            position.x + TILE_SIZE / 2,
            position.y + TILE_SIZE / 2
          );
          const distance = center.distance(centerPos);
          if (distance > radius) {
            poolManager.vector2.release(centerPos);
            poolManager.vector2.release(position);
            continue;
          }
          poolManager.vector2.release(centerPos);
        }

        // Check if there are any zombies at this position
        const tileCenter = poolManager.vector2.claim(
          position.x + TILE_SIZE / 2,
          position.y + TILE_SIZE / 2
        );
        const nearbyEntities = this.getEntityManager().getNearbyEntities(
          tileCenter,
          TILE_SIZE / 2,
          zombieTypes
        );

        // Check if any nearby entities are zombies
        let hasZombie = false;
        for (const entity of nearbyEntities) {
          if (zombieTypes.has(entity.getType())) {
            // Verify the zombie is actually at this tile position
            if (entity.hasExt(Positionable)) {
              const entityPos = entity.getExt(Positionable).getPosition();
              const tileX = Math.floor(entityPos.x / TILE_SIZE);
              const tileY = Math.floor(entityPos.y / TILE_SIZE);
              if (tileX === x && tileY === y) {
                hasZombie = true;
                break;
              }
            }
          }
        }

        poolManager.vector2.release(tileCenter);

        if (!hasZombie) {
          validPositions.add(position);
        } else {
          poolManager.vector2.release(position);
        }
      }
    }

    return validPositions;
  }

  /**
   * Spawns a specified number of crates at random valid positions on the map.
   * Crates are placed on ground tiles without collidables.
   * @param count Number of crates to spawn (default: 4)
   */
  public spawnCrates(count: number): void {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const validPositions: { x: number; y: number }[] = [];

    // Collect all valid spawn positions (ground tiles without collidables)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
          validPositions.push({ x, y });
        }
      }
    }

    if (validPositions.length === 0) {
      console.warn("No valid positions to spawn crates");
      return;
    }

    // Spawn crates at random valid positions
    const cratesSpawned = Math.min(count, validPositions.length);
    for (let i = 0; i < cratesSpawned; i++) {
      const randomIndex = Math.floor(Math.random() * validPositions.length);
      const position = validPositions.splice(randomIndex, 1)[0]; // Remove to avoid duplicates

      const crate = new Crate(this.getGameManagers());
      crate
        .getExt(Positionable)
        .setPosition(
          PoolManager.getInstance().vector2.claim(
            position.x * getConfig().world.TILE_SIZE,
            position.y * getConfig().world.TILE_SIZE
          )
        );
      this.getEntityManager().addEntity(crate);
    }

    console.log(`Spawned ${cratesSpawned} crate(s) on the map`);
  }
}
