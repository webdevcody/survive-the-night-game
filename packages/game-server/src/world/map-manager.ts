import { Boundary } from "@/entities/environment/boundary";
import { Car } from "@/entities/environment/car";
import { Zombie } from "@/entities/enemies/zombie";
import { DEBUG_START_ZOMBIE } from "@shared/debug";
import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import { IEntity } from "@/entities/types";
import PoolManager from "@shared/util/pool-manager";
import { distance } from "@/util/physics";
import { GameMaster } from "@/managers/game-master";
import { ZombieFactory } from "@/util/zombie-factory";
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
import { entityBlocksPlacement } from "@shared/entities/decal-registry";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { balanceConfig } from "@shared/config/balance-config";
import { Crate } from "@/entities/items/crate";
import { CampsiteFire } from "@/entities/environment/campsite-fire";
import { buildSpawnTable } from "./spawn-table-builder";

// Re-export from shared config for backward compatibility
export const BIOME_SIZE = getConfig().world.BIOME_SIZE;
export const MAP_SIZE = getConfig().world.MAP_SIZE;

// Ground tile IDs for valid spawn/placement locations
const GROUND_TILE_ID_1 = 8;
const GROUND_TILE_ID_2 = 4;
const GROUND_TILE_ID_3 = 14;
const GROUND_TILE_ID_4 = 24;

// Collidable tile IDs
const EMPTY_COLLIDABLE_TILE_ID = -1;
const CAR_TILE_ID_LEFT = 265;
const CAR_TILE_ID_RIGHT = 266;
const MERCHANT_TILE_ID = 255;

// Spawn configuration
const IDLE_ZOMBIE_SPAWN_CHANCE = 0.01;

// Survivor spawn configuration
const SURVIVOR_SPAWN_PROBABILITY = 0.5;
const SURVIVOR_MIN_COUNT = 1;
const SURVIVOR_MAX_COUNT = 2;

// Campfire position within campsite biome
const CAMPSITE_CAMPFIRE_LOCAL_X = 8;
const CAMPSITE_CAMPFIRE_LOCAL_Y = 7;

// Car dimensions
const CAR_WIDTH_TILES = 2;

// Biome proximity
const CAMPSITE_PROXIMITY_DISTANCE = 1;

// Debug zombie spawn offset
const DEBUG_ZOMBIE_OFFSET_TILES = 16 * 4;

// Map initialization
const EMPTY_GROUND_TILE_VALUE = 0;

// buildSpawnTable moved to spawn-table-builder.ts

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

    // Get campsite biome position (center biome)
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    // Get all valid spawn locations in the 8 forest biomes surrounding the campsite
    let spawnLocations = this.selectCampsiteSurroundingBiomeSpawnLocations(
      centerBiomeX,
      centerBiomeY,
    );

    if (spawnLocations.length === 0) {
      console.warn("No valid spawn locations found around campsite");
      return;
    }

    // Spawn boss if needed (use first spawn location or fallback)
    this.spawnBossIfNeeded(waveNumber, spawnLocations.length > 0 ? [spawnLocations[0]] : []);

    // Shuffle spawn locations for random distribution
    for (let i = spawnLocations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawnLocations[i], spawnLocations[j]] = [spawnLocations[j], spawnLocations[i]];
    }

    // Create a list of all zombies to spawn with their types
    const zombiesToSpawnList: Array<"regular" | "fast" | "big" | "bat" | "spitter"> = [];
    for (let i = 0; i < zombieDistribution.regular; i++) {
      zombiesToSpawnList.push("regular");
    }
    for (let i = 0; i < zombieDistribution.fast; i++) {
      zombiesToSpawnList.push("fast");
    }
    for (let i = 0; i < zombieDistribution.big; i++) {
      zombiesToSpawnList.push("big");
    }
    for (let i = 0; i < zombieDistribution.bat; i++) {
      zombiesToSpawnList.push("bat");
    }
    for (let i = 0; i < zombieDistribution.spitter; i++) {
      zombiesToSpawnList.push("spitter");
    }

    // Shuffle the zombie list for random type distribution
    for (let i = zombiesToSpawnList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [zombiesToSpawnList[i], zombiesToSpawnList[j]] = [
        zombiesToSpawnList[j],
        zombiesToSpawnList[i],
      ];
    }

    // Track total spawned to verify exact count
    let totalSpawned = {
      regular: 0,
      fast: 0,
      big: 0,
      bat: 0,
      spitter: 0,
    };

    // Spawn each zombie at a random location, removing locations after use to prevent stacking
    for (const zombieType of zombiesToSpawnList) {
      if (spawnLocations.length === 0) {
        console.warn("Ran out of spawn locations before spawning all zombies");
        break;
      }

      // Pick a random location and remove it
      const randomIndex = Math.floor(Math.random() * spawnLocations.length);
      const location = spawnLocations.splice(randomIndex, 1)[0];

      // Spawn the zombie at this location
      this.spawnZombieAtLocation(location, zombieType);

      // Track spawned counts
      totalSpawned[zombieType]++;
    }

    // Verify exact count match
    const expectedTotal = zombieDistribution.total;
    const actualTotal =
      totalSpawned.regular +
      totalSpawned.fast +
      totalSpawned.big +
      totalSpawned.bat +
      totalSpawned.spitter;

    if (expectedTotal !== actualTotal) {
      console.error(
        `Zombie count mismatch! Expected: ${expectedTotal}, Actual: ${actualTotal}. ` +
          `Distribution: regular=${totalSpawned.regular}, fast=${totalSpawned.fast}, ` +
          `big=${totalSpawned.big}, bat=${totalSpawned.bat}, spitter=${totalSpawned.spitter}`,
      );
    }
  }

  /**
   * Select all valid zombie spawn locations in the 8 forest biomes surrounding the campsite.
   * Returns all valid empty ground tile positions from all surrounding biomes.
   */
  private selectCampsiteSurroundingBiomeSpawnLocations(
    campsiteBiomeX: number,
    campsiteBiomeY: number,
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

    // Collect all valid spawn positions from all surrounding biomes
    for (const { biomeX, biomeY } of surroundingBiomes) {
      const validPositions = this.getValidSpawnPositionsInBiome(biomeX, biomeY);

      // Add all valid positions from this biome
      for (const position of validPositions) {
        spawnLocations.push({
          x: position.x,
          y: position.y,
        });
      }
    }

    return spawnLocations;
  }

  private selectZombieSpawnLocations(
    count: number,
    centerBiomeX: number,
    centerBiomeY: number,
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

  /**
   * Spawns a single zombie of the specified type at the given location.
   */
  private spawnZombieAtLocation(
    location: { x: number; y: number },
    zombieType: "regular" | "fast" | "big" | "bat" | "spitter",
  ): void {
    ZombieFactory.spawnZombieAtLocation(zombieType, location, this.getGameManagers());
  }

  /**
   * Spawns zombies around the campsite using the same spawn location logic as normal waves.
   */
  public spawnZombiesAroundCampsite(
    zombieType: "regular" | "fast" | "big" | "bat" | "spitter",
    count: number,
  ): void {
    // Get campsite biome position (center biome)
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    // Get all valid spawn locations in the 8 forest biomes surrounding the campsite
    let spawnLocations = this.selectCampsiteSurroundingBiomeSpawnLocations(
      centerBiomeX,
      centerBiomeY,
    );

    if (spawnLocations.length === 0) {
      console.warn("No valid spawn locations found around campsite");
      return;
    }

    // Shuffle spawn locations for random distribution
    for (let i = spawnLocations.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [spawnLocations[i], spawnLocations[j]] = [spawnLocations[j], spawnLocations[i]];
    }

    // Spawn zombies at valid positions (up to count or available positions)
    const zombiesToSpawn = Math.min(count, spawnLocations.length);
    for (let i = 0; i < zombiesToSpawn; i++) {
      const { x, y } = spawnLocations[i];
      this.spawnZombieAtLocation(
        {
          x,
          y,
        },
        zombieType,
      );
    }

    if (zombiesToSpawn < count) {
      console.warn(
        `Could not spawn all ${count} zombies around campsite. Only ${zombiesToSpawn} valid positions available.`,
      );
    }
  }

  private spawnBossIfNeeded(
    waveNumber: number,
    spawnLocations: Array<{ x: number; y: number }>,
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
    // Check for any boss zombie types
    const bossTypes = [
      Entities.GRAVE_TYRANT,
      Entities.CHARGING_TYRANT,
      Entities.ACID_FLYER,
      Entities.SPLITTER_BOSS,
    ];

    for (const bossType of bossTypes) {
      if (this.getEntityManager().getEntitiesByType(bossType).length > 0) {
        return true;
      }
    }

    return false;
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
      height * getConfig().world.TILE_SIZE,
    );
    this.groundLayer = Array(height)
      .fill(EMPTY_GROUND_TILE_VALUE)
      .map(() => Array(width).fill(EMPTY_GROUND_TILE_VALUE));
    this.collidablesLayer = Array(height)
      .fill(EMPTY_GROUND_TILE_VALUE)
      .map(() => Array(width).fill(EMPTY_COLLIDABLE_TILE_ID));
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
      BIOME_SIZE * MAP_SIZE * getConfig().world.TILE_SIZE,
    );
  }

  private initializeMap() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    this.groundLayer = Array(totalSize)
      .fill(EMPTY_GROUND_TILE_VALUE)
      .map(() => Array(totalSize).fill(EMPTY_GROUND_TILE_VALUE));
    this.collidablesLayer = Array(totalSize)
      .fill(EMPTY_GROUND_TILE_VALUE)
      .map(() => Array(totalSize).fill(EMPTY_COLLIDABLE_TILE_ID));
  }

  /**
   * Checks if a biome position is adjacent to (within 1 tile of) the campsite
   * This is used to enforce a forest-only zone around the campsite
   */
  private isNearCampsite(biomeX: number, biomeY: number): boolean {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const distance = Math.abs(biomeX - centerBiomeX) + Math.abs(biomeY - centerBiomeY);
    return distance <= CAMPSITE_PROXIMITY_DISTANCE;
  }

  /**
   * Checks if a biome position is adjacent to any special biome
   * This ensures there's always at least 1 forest biome between special biomes
   */
  private isAdjacentToSpecialBiome(
    biomeX: number,
    biomeY: number,
    specialBiomes: Array<{ x: number; y: number } | undefined>,
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
    excludedPositions: Array<{ x: number; y: number } | undefined>,
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
          (pos) => pos && pos.x === biomeX && pos.y === biomeY,
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

  private fillMapWithBiomes() {
    for (let biomeY = 0; biomeY < MAP_SIZE; biomeY++) {
      for (let biomeX = 0; biomeX < MAP_SIZE; biomeX++) {
        this.placeBiome(biomeX, biomeY);
      }
    }
  }

  private createForestBoundaries() {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const carTiles = new Set([CAR_TILE_ID_LEFT, CAR_TILE_ID_RIGHT]);
    let carSpawned = false;

    // Check if game mode has car entity
    const gameModeConfig = this.getGameManagers()
      .getGameServer()
      .getGameLoop()
      .getGameModeStrategy()
      .getConfig();
    const shouldSpawnCar = gameModeConfig.hasCarEntity;

    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check collidables layer for any non-empty tile
        const collidableTileId = this.collidablesLayer[y][x];

        if (collidableTileId !== EMPTY_COLLIDABLE_TILE_ID) {
          if (carTiles.has(collidableTileId)) {
            // Always clear car tiles so they don't render as static map tiles
            this.collidablesLayer[y][x] = EMPTY_COLLIDABLE_TILE_ID;

            // Spawn the car entity if we find the left side (265), haven't spawned yet, and game mode has car
            if (collidableTileId === CAR_TILE_ID_LEFT && !carSpawned && shouldSpawnCar) {
              const car = new Car(this.getGameManagers());
              const carPosition = PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE,
              );
              car.getExt(Positionable).setPosition(carPosition);
              this.getEntityManager().addEntity(car);

              // Cache the car entity and location for fast lookup
              this.carEntity = car;
              this.carLocation = car.getExt(Positionable).getCenterPosition();
              carSpawned = true;
            }
          } else {
            // Spawn regular boundary for non-car tiles
            const boundary = new Boundary(this.getGameManagers());
            boundary.setPosition(
              PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE,
              ),
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
        // Check collidables layer for merchant tile
        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId === MERCHANT_TILE_ID) {
          const merchant = new Merchant(this.getGameManagers());
          merchant.setPosition(
            PoolManager.getInstance().vector2.claim(
              x * getConfig().world.TILE_SIZE,
              y * getConfig().world.TILE_SIZE,
            ),
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
        // Check ground layer for valid ground tiles and ensure no collidable is blocking
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[y][x] === EMPTY_COLLIDABLE_TILE_ID) {
          this.trySpawnItemAt(x, y);
        }
      }
    }
  }

  private trySpawnItemAt(x: number, y: number) {
    const spawnTable = buildSpawnTable();
    const random = Math.random();
    let cumulativeChance = 0;

    // Use battle royale multiplier if in that game mode, otherwise use default
    const gameModeConfig = this.getGameManagers()
      .getGameServer()
      .getGameLoop()
      .getGameModeStrategy()
      .getConfig();
    const spawnMultiplier =
      gameModeConfig.modeId === "battle_royale"
        ? balanceConfig.BATTLE_ROYALE_ITEM_SPAWN_MULTIPLIER
        : balanceConfig.MAP_ITEM_SPAWN_MULTIPLIER;

    for (const { chance, entityType } of spawnTable) {
      cumulativeChance += chance;
      // Apply global spawn multiplier to reduce overall item spawn rate
      if (random < cumulativeChance * spawnMultiplier) {
        const entity = this.getEntityManager().createEntity(entityType as any);
        if (entity) {
          entity
            .getExt(Positionable)
            .setPosition(
              PoolManager.getInstance().vector2.claim(
                x * getConfig().world.TILE_SIZE,
                y * getConfig().world.TILE_SIZE,
              ),
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
        poolManager.vector2.claim(
          middleX + DEBUG_ZOMBIE_OFFSET_TILES * getConfig().world.TILE_SIZE,
          middleY,
        ),
      );
      this.getEntityManager().addEntity(zombie);
    }
  }

  private spawnIdleZombies() {
    const totalSize = BIOME_SIZE * MAP_SIZE;

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

        // Check if it's a valid ground tile (grass tiles: 8, 4, 14, 24)
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        // Check if there's no collidable blocking the spawn
        const hasCollidable = this.collidablesLayer[y][x] !== EMPTY_COLLIDABLE_TILE_ID;

        // Only spawn on valid ground tiles without collidables
        if (isValidGround && !hasCollidable) {
          if (Math.random() < IDLE_ZOMBIE_SPAWN_CHANCE) {
            const poolManager = PoolManager.getInstance();
            const position = poolManager.vector2.claim(
              x * getConfig().world.TILE_SIZE,
              y * getConfig().world.TILE_SIZE,
            );

            // Validate position is valid for placement (checks for existing entities)
            if (this.isPositionValidForPlacement(position, true)) {
              ZombieFactory.createZombie("regular", this.getGameManagers(), {
                position,
                addToManager: true,
                isIdle: true,
              });
            } else {
              // Release position if not valid
              poolManager.vector2.release(position);
            }
          }
        }
      }
    }
  }

  private spawnSurvivorsInBiome(biomeX: number, biomeY: number): void {
    // Spawn 1-2 survivors randomly
    const survivorCount =
      Math.random() < SURVIVOR_SPAWN_PROBABILITY ? SURVIVOR_MIN_COUNT : SURVIVOR_MAX_COUNT;

    // Collect all valid spawn positions within this biome
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === EMPTY_COLLIDABLE_TILE_ID) {
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
            position.y * getConfig().world.TILE_SIZE,
          ),
        );
      this.getEntityManager().addEntity(entity);
    }
  }

  /**
   * Spawn a single survivor in a random biome
   * @returns true if survivor was successfully spawned, false otherwise
   */
  public spawnSurvivorInRandomBiome(): boolean {
    const biomePosition = this.selectRandomBiomePosition([]);
    if (!biomePosition) {
      console.warn("No valid biome position found to spawn survivor");
      return false;
    }

    // Collect all valid spawn positions within this biome
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomePosition.y * BIOME_SIZE + y;
        const mapX = biomePosition.x * BIOME_SIZE + x;
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === EMPTY_COLLIDABLE_TILE_ID) {
          validPositions.push({ x: mapX, y: mapY });
        }
      }
    }

    if (validPositions.length === 0) {
      console.warn(
        `No valid positions to spawn survivor in biome at (${biomePosition.x}, ${biomePosition.y})`,
      );
      return false;
    }

    const entity = this.getEntityManager().createEntity(Entities.SURVIVOR);
    if (!entity) {
      console.warn(`Failed to create survivor entity`);
      return false;
    }

    // Pick a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    const position = validPositions[randomIndex];

    entity
      .getExt(Positionable)
      .setPosition(
        PoolManager.getInstance().vector2.claim(
          position.x * getConfig().world.TILE_SIZE,
          position.y * getConfig().world.TILE_SIZE,
        ),
      );
    this.getEntityManager().addEntity(entity);
    return true;
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
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === EMPTY_COLLIDABLE_TILE_ID) {
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
            position.y * getConfig().world.TILE_SIZE,
          ),
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
      const campfireLocalX = CAMPSITE_CAMPFIRE_LOCAL_X;
      const campfireLocalY = CAMPSITE_CAMPFIRE_LOCAL_Y;
      const absoluteX = biomeX * BIOME_SIZE + campfireLocalX;
      const absoluteY = biomeY * BIOME_SIZE + campfireLocalY;

      const campsiteFire = new CampsiteFire(this.getGameManagers());
      campsiteFire
        .getExt(Positionable)
        .setPosition(
          PoolManager.getInstance().vector2.claim(
            absoluteX * getConfig().world.TILE_SIZE,
            absoluteY * getConfig().world.TILE_SIZE,
          ),
        );
      this.getEntityManager().addEntity(campsiteFire);
    }

    this.spawnBiomeItems(biome, biomeX, biomeY);
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

    // Collect all valid ground tile positions
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[y][x] === EMPTY_COLLIDABLE_TILE_ID) {
          const poolManager = PoolManager.getInstance();
          const position = poolManager.vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE,
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
        (totalSize * getConfig().world.TILE_SIZE) / 2,
      );
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  /**
   * Get a random grass position on the map, excluding the campsite biome.
   * Used for Battle Royale mode where players should spawn spread throughout the map.
   */
  public getRandomGrassPositionExcludingCampsite(): Vector2 {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const validPositions: Vector2[] = [];

    // Collect all valid ground tile positions (excluding campsite biome)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check if this tile is in the campsite biome - skip if so
        const biomeX = Math.floor(x / BIOME_SIZE);
        const biomeY = Math.floor(y / BIOME_SIZE);
        if (biomeX === centerBiomeX && biomeY === centerBiomeY) {
          continue;
        }

        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[y][x] === EMPTY_COLLIDABLE_TILE_ID) {
          const poolManager = PoolManager.getInstance();
          const position = poolManager.vector2.claim(
            x * getConfig().world.TILE_SIZE,
            y * getConfig().world.TILE_SIZE,
          );
          validPositions.push(position);
        }
      }
    }

    if (validPositions.length === 0) {
      // Fallback to any grass position if no positions found outside campsite
      return this.getRandomGrassPosition();
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
      position.x < carPos.x + getConfig().world.TILE_SIZE * CAR_WIDTH_TILES &&
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

  /**
   * Clears the cached car entity and location.
   * Should be called when the car is destroyed/removed.
   */
  public clearCarCache(): void {
    this.carEntity = null;
    this.carLocation = null;
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
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === EMPTY_COLLIDABLE_TILE_ID) {
          const poolManager = PoolManager.getInstance();
          const position = poolManager.vector2.claim(
            mapX * getConfig().world.TILE_SIZE,
            mapY * getConfig().world.TILE_SIZE,
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
    entitySize?: number,
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
      groundTile === GROUND_TILE_ID_1 ||
      groundTile === GROUND_TILE_ID_2 ||
      groundTile === GROUND_TILE_ID_3 ||
      groundTile === GROUND_TILE_ID_4;

    if (!isValidGround) {
      return false;
    }

    // Check if there's a collidable
    if (this.collidablesLayer[gridY]?.[gridX] !== EMPTY_COLLIDABLE_TILE_ID) {
      return false;
    }

    // Check if there are any entities at this position
    if (checkEntities) {
      const poolManager = PoolManager.getInstance();
      const positionCenter = poolManager.vector2.claim(
        position.x + size / 2,
        position.y + size / 2,
      );
      const nearbyEntities = this.getEntityManager().getNearbyEntities(positionCenter, size);

      for (const entity of nearbyEntities) {
        if (!entity.hasExt(Positionable)) continue;

        const entityType = entity.getType();
        // Skip entities that don't block placement (e.g., visual-only decals)
        if (!entityBlocksPlacement(entityType)) continue;

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
  public getCampsiteSurroundingBiomeCenters(): Vector2[] {
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);
    const tileSize = getConfig().world.TILE_SIZE;
    const poolManager = PoolManager.getInstance();
    const centers: Vector2[] = [];

    // Get the 8 surrounding biomes (3x3 grid minus the center campsite)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        // Skip the center campsite biome itself
        if (dx === 0 && dy === 0) {
          continue;
        }

        const biomeX = centerBiomeX + dx;
        const biomeY = centerBiomeY + dy;

        // Ensure biome is within map bounds
        if (biomeX >= 0 && biomeX < MAP_SIZE && biomeY >= 0 && biomeY < MAP_SIZE) {
          // Convert biome coordinates to world pixel coordinates
          // Center of biome = biomeX * BIOME_SIZE * TILE_SIZE + (BIOME_SIZE / 2) * TILE_SIZE
          const centerTileX = biomeX * BIOME_SIZE + Math.floor(BIOME_SIZE / 2);
          const centerTileY = biomeY * BIOME_SIZE + Math.floor(BIOME_SIZE / 2);
          const worldX = centerTileX * tileSize;
          const worldY = centerTileY * tileSize;

          centers.push(poolManager.vector2.claim(worldX, worldY));
        }
      }
    }

    return centers;
  }

  public getValidSpawnPositionsInBiome(biomeX: number, biomeY: number): Vector2[] {
    const { TILE_SIZE } = getConfig().world;
    const validPositions: Vector2[] = [];
    const poolManager = PoolManager.getInstance();
    const zombieTypes = getZombieTypesSet();

    // Calculate biome bounds
    const minTileX = biomeX * BIOME_SIZE;
    const maxTileX = Math.min((biomeX + 1) * BIOME_SIZE, BIOME_SIZE * MAP_SIZE);
    const minTileY = biomeY * BIOME_SIZE;
    const maxTileY = Math.min((biomeY + 1) * BIOME_SIZE, BIOME_SIZE * MAP_SIZE);

    // Iterate through tiles in the biome
    for (let y = minTileY; y < maxTileY; y++) {
      for (let x = minTileX; x < maxTileX; x++) {
        // Check if it's a valid ground tile
        const groundTile = this.groundLayer[y]?.[x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (!isValidGround) {
          continue;
        }

        // Check if there's a collidable
        if (this.collidablesLayer[y]?.[x] !== EMPTY_COLLIDABLE_TILE_ID) {
          continue;
        }

        // Convert tile coordinates to pixel coordinates
        const position = poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE);

        // Check if there are any zombies at this position
        const tileCenter = poolManager.vector2.claim(
          position.x + TILE_SIZE / 2,
          position.y + TILE_SIZE / 2,
        );
        const nearbyEntities = this.getEntityManager().getNearbyEntities(
          tileCenter,
          TILE_SIZE / 2,
          zombieTypes,
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
          validPositions.push(position);
        } else {
          poolManager.vector2.release(position);
        }
      }
    }

    return validPositions;
  }

  /**
   * Finds a random valid spawn position within a radius range from a center point.
   * Checks for valid ground tiles, collidables, and existing zombies.
   * @param center Center position to search around
   * @param minRadius Minimum distance from center (in pixels)
   * @param maxRadius Maximum distance from center (in pixels)
   * @returns A random valid spawn position, or null if none found
   */
  public findRandomValidSpawnPosition(
    center: Vector2,
    minRadius: number,
    maxRadius: number,
  ): Vector2 | null {
    // Get all empty ground tiles within max radius
    const emptyTiles = this.getEmptyGroundTiles(center, maxRadius);

    if (emptyTiles.size === 0) {
      return null;
    }

    // Filter tiles to only those within the min/max radius
    const validTiles: Vector2[] = [];
    const poolManager = PoolManager.getInstance();
    const { TILE_SIZE } = getConfig().world;

    for (const tile of emptyTiles) {
      const tileCenter = poolManager.vector2.claim(tile.x + TILE_SIZE / 2, tile.y + TILE_SIZE / 2);
      const dist = distance(center, tileCenter);

      if (dist >= minRadius && dist <= maxRadius) {
        validTiles.push(tile);
      } else {
        poolManager.vector2.release(tile);
      }

      poolManager.vector2.release(tileCenter);
    }

    if (validTiles.length === 0) {
      return null;
    }

    // Pick a random valid tile
    const randomIndex = Math.floor(Math.random() * validTiles.length);
    const selectedTile = validTiles[randomIndex];

    // Release other tiles
    for (const tile of validTiles) {
      if (tile !== selectedTile) {
        poolManager.vector2.release(tile);
      }
    }

    return selectedTile;
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
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (!isValidGround) {
          continue;
        }

        // Check if there's a collidable
        if (this.collidablesLayer[y]?.[x] !== EMPTY_COLLIDABLE_TILE_ID) {
          continue;
        }

        // Convert tile coordinates to pixel coordinates
        const position = poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE);

        // If center and radius are provided, check distance
        if (center && radius !== undefined) {
          const centerPos = poolManager.vector2.claim(
            position.x + TILE_SIZE / 2,
            position.y + TILE_SIZE / 2,
          );
          const dist = distance(center, centerPos);
          if (dist > radius) {
            poolManager.vector2.release(centerPos);
            poolManager.vector2.release(position);
            continue;
          }
          poolManager.vector2.release(centerPos);
        }

        // Check if there are any zombies at this position
        const tileCenter = poolManager.vector2.claim(
          position.x + TILE_SIZE / 2,
          position.y + TILE_SIZE / 2,
        );
        const nearbyEntities = this.getEntityManager().getNearbyEntities(
          tileCenter,
          TILE_SIZE / 2,
          zombieTypes,
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
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[y][x] === EMPTY_COLLIDABLE_TILE_ID) {
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
            position.y * getConfig().world.TILE_SIZE,
          ),
        );
      this.getEntityManager().addEntity(crate);
    }
  }

  /**
   * Spawns a single crate in a random biome with 10 items.
   * @returns true if crate was successfully spawned, false otherwise
   */
  public spawnCrateInRandomBiome(): boolean {
    // Select a random biome position
    const biomePosition = this.selectRandomBiomePosition([]);
    if (!biomePosition) {
      console.warn("No valid biome position found to spawn crate");
      return false;
    }

    // Collect all valid spawn positions within this biome
    const validPositions: { x: number; y: number }[] = [];
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomePosition.y * BIOME_SIZE + y;
        const mapX = biomePosition.x * BIOME_SIZE + x;
        const groundTile = this.groundLayer[mapY][mapX];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;

        if (isValidGround && this.collidablesLayer[mapY][mapX] === EMPTY_COLLIDABLE_TILE_ID) {
          validPositions.push({ x: mapX, y: mapY });
        }
      }
    }

    if (validPositions.length === 0) {
      console.warn(
        `No valid positions to spawn crate in biome at (${biomePosition.x}, ${biomePosition.y})`,
      );
      return false;
    }

    // Pick a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    const position = validPositions[randomIndex];

    // Spawn crate with 10 items
    const crate = new Crate(this.getGameManagers(), 10);
    crate
      .getExt(Positionable)
      .setPosition(
        PoolManager.getInstance().vector2.claim(
          position.x * getConfig().world.TILE_SIZE,
          position.y * getConfig().world.TILE_SIZE,
        ),
      );
    this.getEntityManager().addEntity(crate);

    return true;
  }
}
