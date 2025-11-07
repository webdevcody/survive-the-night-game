import { Tree } from "@/entities/items/tree";
import { Boundary } from "@/entities/environment/boundary";
import { Zombie } from "@/entities/enemies/zombie";
import { DEBUG_START_ZOMBIE } from "@shared/debug";
import { Shotgun } from "@/entities/weapons/shotgun";
import { Pistol } from "@/entities/weapons/pistol";
import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import { PistolAmmo } from "@/entities/items/pistol-ammo";
import { ShotgunAmmo } from "@/entities/items/shotgun-ammo";
import Vector2 from "@/util/vector2";
import { BigZombie } from "@/entities/enemies/big-zombie";
import { FastZombie } from "@/entities/enemies/fast-zombie";
import { BatZombie } from "@/entities/enemies/bat-zombie";
import { GameMaster } from "./game-master";
import { Knife } from "@/entities/weapons/knife";
import { Bandage } from "@/entities/items/bandage";
import { Cloth } from "@/entities/items/cloth";
import { Gasoline } from "@/entities/items/gasoline";
import { Grenade } from "@/entities/items/grenade";
import { Landmine } from "@/entities/items/landmine";
import { Spikes } from "@/entities/items/spikes";
import { Torch } from "@/entities/items/torch";
import { Wall } from "@/entities/items/wall";
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
  type BiomeData,
  FOREST4,
  DOCK,
  SHED,
} from "@/biomes";
import type { MapData } from "@shared/events/server-sent/map-event";
import { AK47 } from "@/entities/weapons/ak47";
import { AK47Ammo } from "@/entities/items/ak47-ammo";
import { BoltActionAmmo } from "@/entities/items/bolt-action-ammo";
import { BoltActionRifle } from "@/entities/weapons/bolt-action-rifle";
import { getConfig } from "@/config";

const WEAPON_SPAWN_CHANCE = {
  // Weapons
  PISTOL: 0.0015,
  SHOTGUN: 0.0015,
  KNIFE: 0.002,
  BOLT_ACTION_RIFLE: 0.0015,
  AK47: 0.0015,
  // ammo
  PISTOL_AMMO: 0.005,
  SHOTGUN_AMMO: 0.005,
  BOLT_ACTION_AMMO: 0.005,
  AK47_AMMO: 0.005,
  // Items
  BANDAGE: 0.005,
  CLOTH: 0.008,
  GASOLINE: 0.002,
  GRENADE: 0,
  LANDMINE: 0.001,
  SPIKES: 0.003,
  TORCH: 0.003,
  WALL: 0.005,
  TREE: 0.1,
} as const;

const spawnTable = [
  { chance: WEAPON_SPAWN_CHANCE.PISTOL, ItemClass: Pistol },
  { chance: WEAPON_SPAWN_CHANCE.SHOTGUN, ItemClass: Shotgun },
  { chance: WEAPON_SPAWN_CHANCE.KNIFE, ItemClass: Knife },
  { chance: WEAPON_SPAWN_CHANCE.BANDAGE, ItemClass: Bandage },
  { chance: WEAPON_SPAWN_CHANCE.CLOTH, ItemClass: Cloth },
  { chance: WEAPON_SPAWN_CHANCE.GASOLINE, ItemClass: Gasoline },
  { chance: WEAPON_SPAWN_CHANCE.GRENADE, ItemClass: Grenade },
  { chance: WEAPON_SPAWN_CHANCE.LANDMINE, ItemClass: Landmine },
  { chance: WEAPON_SPAWN_CHANCE.SPIKES, ItemClass: Spikes },
  { chance: WEAPON_SPAWN_CHANCE.WALL, ItemClass: Wall },
  { chance: WEAPON_SPAWN_CHANCE.TORCH, ItemClass: Torch },
  { chance: WEAPON_SPAWN_CHANCE.PISTOL, ItemClass: Pistol },
  { chance: WEAPON_SPAWN_CHANCE.BOLT_ACTION_RIFLE, ItemClass: BoltActionRifle },
  { chance: WEAPON_SPAWN_CHANCE.AK47, ItemClass: AK47 },
  { chance: WEAPON_SPAWN_CHANCE.PISTOL_AMMO, ItemClass: PistolAmmo },
  { chance: WEAPON_SPAWN_CHANCE.SHOTGUN_AMMO, ItemClass: ShotgunAmmo },
  { chance: WEAPON_SPAWN_CHANCE.BOLT_ACTION_AMMO, ItemClass: BoltActionAmmo },
  { chance: WEAPON_SPAWN_CHANCE.AK47_AMMO, ItemClass: AK47Ammo },
  { chance: WEAPON_SPAWN_CHANCE.TREE, ItemClass: Tree },
];

const BIOME_SIZE = 16;
const MAP_SIZE = 16;

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

  public spawnZombies(dayNumber: number) {
    if (!this.gameMaster) {
      throw new Error("MapManager: GameMaster was not set");
    }

    const zombieDistribution = this.gameMaster.getNumberOfZombies(dayNumber);
    const zombiesToSpawn = zombieDistribution.total;

    console.log("Spawning zombies", zombiesToSpawn);

    const totalSize = BIOME_SIZE * MAP_SIZE;
    const centerBiomeX = Math.floor(MAP_SIZE / 2);
    const centerBiomeY = Math.floor(MAP_SIZE / 2);

    // Pick 3 random spawn locations on the outskirts of the map
    const spawnLocations = this.selectZombieSpawnLocations(3, centerBiomeX, centerBiomeY);

    // Divide zombies across the 3 spawn locations
    const zombiesPerLocation = {
      regular: Math.floor(zombieDistribution.regular / 3),
      fast: Math.floor(zombieDistribution.fast / 3),
      big: Math.floor(zombieDistribution.big / 3),
      bat: Math.floor(zombieDistribution.bat / 3),
      spitter: Math.floor(zombieDistribution.spitter / 3),
    };

    // Handle remainder zombies (distribute to first location)
    const remainderZombies = {
      regular: zombieDistribution.regular % 3,
      fast: zombieDistribution.fast % 3,
      big: zombieDistribution.big % 3,
      bat: zombieDistribution.bat % 3,
      spitter: zombieDistribution.spitter % 3,
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
    location: { biomeX: number; biomeY: number },
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

    // Calculate spawn area boundaries (entire biome + adjacent tiles for spreading)
    const biomeStartX = location.biomeX * BIOME_SIZE;
    const biomeStartY = location.biomeY * BIOME_SIZE;
    const biomeEndX = biomeStartX + BIOME_SIZE;
    const biomeEndY = biomeStartY + BIOME_SIZE;

    // Expand spawn area slightly beyond biome boundaries
    const spawnAreaStartX = Math.max(0, biomeStartX - 3);
    const spawnAreaStartY = Math.max(0, biomeStartY - 3);
    const spawnAreaEndX = Math.min(totalSize, biomeEndX + 3);
    const spawnAreaEndY = Math.min(totalSize, biomeEndY + 3);

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
        console.warn(
          `Could not spawn all zombies at location (${location.biomeX}, ${location.biomeY})`
        );
        break;
      }

      // Random position within the spawn area
      const x =
        Math.floor(Math.random() * (spawnAreaEndX - spawnAreaStartX)) + spawnAreaStartX;
      const y =
        Math.floor(Math.random() * (spawnAreaEndY - spawnAreaStartY)) + spawnAreaStartY;

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
          new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.bat++;
      } else if (spawnedCount.big < distribution.big) {
        const zombie = new BigZombie(this.getGameManagers());
        zombie.setPosition(
          new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.big++;
      } else if (spawnedCount.fast < distribution.fast) {
        const zombie = new FastZombie(this.getGameManagers());
        zombie.setPosition(
          new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.fast++;
      } else if (spawnedCount.regular < distribution.regular) {
        const zombie = new Zombie(this.getGameManagers());
        zombie.setPosition(
          new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.regular++;
      } else if (spawnedCount.spitter < distribution.spitter) {
        const zombie = new SpitterZombie(this.getGameManagers());
        zombie.setPosition(
          new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
        );
        this.getEntityManager().addEntity(zombie);
        spawnedCount.spitter++;
      }
    }
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
  }

  generateMap() {
    this.getEntityManager().clear();
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
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check collidables layer for any non-empty tile
        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId !== -1) {
          const boundary = new Boundary(this.getGameManagers());
          boundary.setPosition(
            new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
          );
          this.getEntityManager().addEntity(boundary);
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
            new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
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
    const random = Math.random();
    let cumulativeChance = 0;

    for (const { chance, ItemClass } of spawnTable) {
      cumulativeChance += chance;
      if (random < cumulativeChance) {
        const item = new ItemClass(this.getGameManagers());
        item
          .getExt(Positionable)
          .setPosition(
            new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
          );
        this.getEntityManager().addEntity(item);
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
      zombie.setPosition(new Vector2(middleX + 16 * 4 * getConfig().world.TILE_SIZE, middleY));
      this.getEntityManager().addEntity(zombie);
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
          new Vector2(
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

    // Collect all valid ground tile positions (8, 4, 14, 24 are grass/ground tiles)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === 8 || groundTile === 4 || groundTile === 14 || groundTile === 24;

        if (isValidGround && this.collidablesLayer[y][x] === -1) {
          validPositions.push(
            new Vector2(x * getConfig().world.TILE_SIZE, y * getConfig().world.TILE_SIZE)
          );
        }
      }
    }

    if (validPositions.length === 0) {
      // Fallback to center if no grass tiles found
      return new Vector2(
        (totalSize * getConfig().world.TILE_SIZE) / 2,
        (totalSize * getConfig().world.TILE_SIZE) / 2
      );
    }

    // Return a random position from valid positions
    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  private getRandomCampsitePosition(): Vector2 | null {
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
          validPositions.push(
            new Vector2(mapX * getConfig().world.TILE_SIZE, mapY * getConfig().world.TILE_SIZE)
          );
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
}
