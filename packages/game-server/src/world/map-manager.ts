import { Boundary } from "@/entities/environment/boundary";
import { Car } from "@/entities/environment/car";
import { ZombieSpawnPoint } from "@/entities/environment/zombie-spawn-point";
import { ItemSpawnPoint } from "@/entities/environment/item-spawn-point";
import { DialogueSurvivorNpc } from "@/entities/environment/dialogue-survivor-npc";
import { Zombie } from "@/entities/enemies/zombie";
import { DEBUG_START_ZOMBIE } from "@shared/debug";
import { IGameManagers, IEntityManager, IMapManager } from "@/managers/types";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import { IEntity } from "@/entities/types";
import PoolManager from "@shared/util/pool-manager";
import { distance } from "@/util/physics";
import { ZombieFactory, type ZombieType } from "@/util/zombie-factory";
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
import { getConfig } from "@shared/config";
import { entityBlocksPlacement } from "@shared/entities/decal-registry";
import { Entities, getZombieTypesSet } from "@shared/constants";
import { Crate } from "@/entities/items/crate";
import { CampsiteFire } from "@/entities/environment/campsite-fire";
import { LightDecal } from "@/entities/environment/light-decal";
import { MessageDecal } from "@/entities/environment/message-decal";
import { createSeededRng } from "@shared/util/seeded-rng";
import { tryLoadWorldMapFile, validateWorldMapDimensions, type WorldMapFile } from "@/world/load-world-map";
import {
  SPAWN_TILE_PLAYER,
  isEnemySpawnTile,
  isItemSpawnTile,
  isNpcDialogueSpawnTile,
  spawnTileIdToZombieType,
  spawnTileIdToItemFixtureType,
} from "../../../game-shared/src/map/spawn-palette";
import type {
  WorldMapDialogueNpcEntry,
  WorldMapMessageDecalEntry,
  WorldMapSpawnerMetaEntry,
} from "../../../game-shared/src/map/world-map-types";
import {
  getMessageDecalLines,
  normalizeDialogueNpcs,
  reconcileMessageDecalsWithDecalsLayer,
  reconcileSpawnerMetaWithSpawnsLayer,
  rewriteSpawnsLayerDialogueNpcTiles,
} from "../../../game-shared/src/map/world-map-types";
import type { WorldMapQuestDefinition } from "../../../game-shared/src/map/quest-types";
import { normalizeQuests } from "../../../game-shared/src/map/quest-types";
import {
  DECAL_TILE_CAMPSITE,
  DECAL_TILE_LIGHT,
  DECAL_TILE_MESSAGE,
} from "../../../game-shared/src/map/decal-palette";

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

/** When false, no survivors are placed by map generation or spawn helpers. Entity type remains registered. */
const ENABLE_SURVIVOR_SPAWNS = false;

// Survivor spawn configuration (used only when ENABLE_SURVIVOR_SPAWNS is true)
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

/** When false, biome `items` ground pickups are skipped. Procedural map-wide item spawns are not run. */
const ENABLE_GROUND_ITEM_SPAWNS = false;

export class MapManager implements IMapManager {
  private groundLayer: number[][] = [];
  private collidablesLayer: number[][] = [];
  /** Spawn palette layer (0 none, 1 player, 2–6 zombies); only filled when world-map.json is applied. */
  private spawnLayer: number[][] = [];
  /** Decal layer (e.g. campsite marker); only filled when world-map.json is applied. */
  private decalsLayer: number[][] = [];
  /** Biome grid coords of the campsite (procedural: center; authored: from decals layer). */
  private campsiteBiomeX = Math.floor(MAP_SIZE / 2);
  private campsiteBiomeY = Math.floor(MAP_SIZE / 2);
  /** Tile coords (col, row) for the campsite fire entity — same as first campsite decal when authored. */
  private campsiteFireTileX = Math.floor(MAP_SIZE / 2) * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_X;
  private campsiteFireTileY = Math.floor(MAP_SIZE / 2) * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_Y;
  /** True after a valid authored `world-map.json` was applied this `generateMap()`. */
  private authoredWorldMapApplied = false;
  /** Normalized dialogue NPC entries from the last applied authored map (tile row/col + message). */
  private authoredDialogueNpcs: WorldMapDialogueNpcEntry[] = [];
  /** Message decal entries aligned with `DECAL_TILE_MESSAGE` cells on the decals layer. */
  private authoredMessageDecals: WorldMapMessageDecalEntry[] = [];
  /** Spawner labels + optional respawn overrides (reconciled to non-dialogue spawns layer cells). */
  private authoredSpawnerMeta: WorldMapSpawnerMetaEntry[] = [];
  private authoredQuests: WorldMapQuestDefinition[] = [];
  private gameManagers?: IGameManagers;
  private entityManager?: IEntityManager;
  private farmBiomePosition?: { x: number; y: number };
  private gasStationBiomePosition?: { x: number; y: number };
  private cityBiomePosition?: { x: number; y: number };
  private dockBiomePosition?: { x: number; y: number };
  private shedBiomePosition?: { x: number; y: number };
  private merchantBiomePositions: Array<{ x: number; y: number }> = [];
  private carLocation?: Vector2 | null;
  private carEntity?: IEntity | null;
  /** Non-null only while `generateMap()` runs — deterministic layout from MAP_SEED. */
  private mapGenRng: ReturnType<typeof createSeededRng> | null = null;

  constructor() {}

  private mapRandom(): number {
    return this.mapGenRng !== null ? this.mapGenRng.next() : Math.random();
  }

  public setGameManagers(gameManagers: IGameManagers) {
    this.gameManagers = gameManagers;
    this.entityManager = gameManagers.getEntityManager();
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
    return {
      ground: this.groundLayer,
      collidables: this.collidablesLayer,
      biomePositions: {
        campsite: { x: this.campsiteBiomeX, y: this.campsiteBiomeY },
        farm: this.farmBiomePosition,
        gasStation: this.gasStationBiomePosition,
        city: this.cityBiomePosition,
        dock: this.dockBiomePosition,
        shed: this.shedBiomePosition,
        merchants: this.merchantBiomePositions,
      },
      quests: this.authoredQuests.length > 0 ? this.authoredQuests : undefined,
    };
  }

  public getAuthoredQuests(): readonly WorldMapQuestDefinition[] {
    return this.authoredQuests;
  }

  public getQuestDefinition(id: string): WorldMapQuestDefinition | undefined {
    return this.authoredQuests.find((q) => q.id === id);
  }

  public getGroundLayer(): number[][] {
    return this.groundLayer;
  }

  public getCollidablesLayer(): number[][] {
    return this.collidablesLayer;
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
    let spawnLocations = this.selectCampsiteSurroundingBiomeSpawnLocations(
      this.campsiteBiomeX,
      this.campsiteBiomeY,
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
    this.spawnLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    this.decalsLayer = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));
    this.carLocation = null;
    this.carEntity = null;
  }

  generateMap() {
    const seed = getConfig().world.MAP_SEED;
    this.mapGenRng = createSeededRng(seed);
    try {
      this.authoredWorldMapApplied = false;
      this.getEntityManager().clear();
      this.carLocation = null;
      this.carEntity = null;
      this.generateSpatialGrid();
      this.initializeMap();

      const authored = tryLoadWorldMapFile();
      if (authored && this.applyAuthoredWorldMap(authored)) {
        this.resolveCampsiteBiomeFromDecals();
        this.spawnCampsiteFireAtTile(this.campsiteFireTileX, this.campsiteFireTileY);
      } else {
        this.campsiteBiomeX = Math.floor(MAP_SIZE / 2);
        this.campsiteBiomeY = Math.floor(MAP_SIZE / 2);
        this.selectRandomFarmBiomePosition();
        this.selectRandomGasStationBiomePosition();
        this.selectRandomCityBiomePosition();
        this.selectRandomDockBiomePosition();
        this.selectRandomShedBiomePosition();
        this.fillMapWithBiomes();
      }

      this.spawnLightDecalEntitiesFromDecalsLayer();
      this.spawnMessageDecalEntitiesFromDecalsLayer();

      this.createForestBoundaries();
      this.spawnMerchants();
      if (this.isOpenWorldMode()) {
        if (this.authoredWorldMapApplied) {
          this.seedOpenWorldZombieSpawnPointsFromAuthoredLayer();
          this.seedItemSpawnPointsFromAuthoredLayer();
          this.seedDialogueSurvivorNpcsFromAuthoredLayer();
        } else {
          this.seedOpenWorldZombieSpawnPoints();
        }
      } else {
        this.spawnIdleZombies();
      }
      this.spawnDebugZombieIfEnabled();
    } finally {
      this.mapGenRng = null;
    }
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
    this.spawnLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));
    this.decalsLayer = Array(totalSize)
      .fill(0)
      .map(() => Array(totalSize).fill(0));
    this.authoredDialogueNpcs = [];
    this.authoredMessageDecals = [];
    this.authoredSpawnerMeta = [];
    this.authoredQuests = [];
  }

  /**
   * Sets campsite biome from the first campsite decal (tile scan order).
   * Fire is placed on that decal tile; if no decal, uses map-center biome and legacy local (8,7).
   */
  private resolveCampsiteBiomeFromDecals(): void {
    const n = BIOME_SIZE * MAP_SIZE;
    let bx = Math.floor(MAP_SIZE / 2);
    let by = Math.floor(MAP_SIZE / 2);
    let fireTx = bx * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_X;
    let fireTy = by * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_Y;
    outer: for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.decalsLayer[y]?.[x] === DECAL_TILE_CAMPSITE) {
          bx = Math.floor(x / BIOME_SIZE);
          by = Math.floor(y / BIOME_SIZE);
          fireTx = x;
          fireTy = y;
          break outer;
        }
      }
    }
    this.campsiteBiomeX = bx;
    this.campsiteBiomeY = by;
    this.campsiteFireTileX = fireTx;
    this.campsiteFireTileY = fireTy;
  }

  /** When world-map.json exists and is valid, copy into layers. */
  private applyAuthoredWorldMap(data: WorldMapFile): boolean {
    if (!validateWorldMapDimensions(data)) {
      console.warn("MapManager: world-map.json has invalid dimensions; using procedural generation.");
      return false;
    }
    const n = BIOME_SIZE * MAP_SIZE;
    const hasSpawns = data.spawns !== undefined && data.spawns.length === n;
    const hasDecals = data.decals !== undefined && data.decals.length === n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        this.groundLayer[y][x] = data.ground[y][x];
        this.collidablesLayer[y][x] = data.collidables[y][x];
        this.spawnLayer[y][x] = hasSpawns ? data.spawns![y][x] : 0;
        this.decalsLayer[y][x] = hasDecals ? data.decals![y][x] : 0;
      }
    }
    this.authoredDialogueNpcs = normalizeDialogueNpcs(data.dialogueNpcs, n);
    rewriteSpawnsLayerDialogueNpcTiles(this.spawnLayer, this.authoredDialogueNpcs);
    this.authoredMessageDecals = reconcileMessageDecalsWithDecalsLayer(
      this.decalsLayer,
      data.messageDecals,
      n,
    );
    this.authoredQuests = normalizeQuests(data.quests, n);
    this.authoredSpawnerMeta = reconcileSpawnerMetaWithSpawnsLayer(this.spawnLayer, data.spawnerMeta);
    this.authoredWorldMapApplied = true;
    return true;
  }

  /**
   * Player join / respawn: authored map uses spawn layer id 1 with empty collidables (no campsite fallback).
   * Procedural maps use campsite then grass.
   */
  public getPlayerSpawnPositionForMap(): Vector2 {
    if (!this.authoredWorldMapApplied) {
      return this.getRandomCampsitePosition() ?? this.getRandomGrassPosition();
    }

    const pos = this.getRandomSpawnLayerPlayerPosition();
    if (pos) {
      return pos;
    }

    console.warn(
      "MapManager: authored world map has no valid player spawn tiles (spawns layer id 1 with empty collidables, not overlapping car).",
    );
    throw new Error("No valid player spawn markers in world-map spawns layer.");
  }

  /**
   * Restore open-world join at a saved tile: must be in bounds, empty collidable, and not overlapping the car.
   */
  public tryGetPositionForSavedTile(tileX: number, tileY: number): Vector2 | null {
    const n = BIOME_SIZE * MAP_SIZE;
    const tx = Math.floor(tileX);
    const ty = Math.floor(tileY);
    if (tx < 0 || ty < 0 || tx >= n || ty >= n) {
      return null;
    }
    if (this.collidablesLayer[ty]?.[tx] !== EMPTY_COLLIDABLE_TILE_ID) {
      return null;
    }
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const poolManager = PoolManager.getInstance();
    const position = poolManager.vector2.claim(tx * TILE_SIZE, ty * TILE_SIZE);
    if (this.doesPositionOverlapWithCar(position)) {
      poolManager.vector2.release(position);
      return null;
    }
    return position;
  }

  private getRandomSpawnLayerPlayerPosition(): Vector2 | null {
    const n = BIOME_SIZE * MAP_SIZE;
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const poolManager = PoolManager.getInstance();
    const validPositions: Vector2[] = [];

    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.spawnLayer[y][x] !== SPAWN_TILE_PLAYER) {
          continue;
        }
        // Authored maps use the full ground tileset; only four IDs are used for procedural
        // "grass". Trust explicit spawn markers + collidables (same as client movement).
        if (this.collidablesLayer[y][x] !== EMPTY_COLLIDABLE_TILE_ID) {
          continue;
        }

        const position = poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE);
        if (!this.doesPositionOverlapWithCar(position)) {
          validPositions.push(position);
        } else {
          poolManager.vector2.release(position);
        }
      }
    }

    if (validPositions.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * validPositions.length);
    return validPositions[randomIndex];
  }

  private seedOpenWorldZombieSpawnPointsFromAuthoredLayer(): void {
    const totalSize = BIOME_SIZE * MAP_SIZE;

    let anyEnemyMarker = false;
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const id = this.spawnLayer[y][x];
        if (!isEnemySpawnTile(id)) {
          continue;
        }
        anyEnemyMarker = true;
        const zombieType = spawnTileIdToZombieType(id);
        if (!zombieType) {
          continue;
        }

        const meta = this.authoredSpawnerMeta.find((e) => e.row === y && e.col === x);
        const respawnOverrideMs =
          meta?.respawnIntervalSec !== undefined
            ? Math.round(meta.respawnIntervalSec * 1000)
            : undefined;
        const spawner = new ZombieSpawnPoint(
          this.getGameManagers(),
          zombieType,
          x,
          y,
          true,
          respawnOverrideMs,
        );
        this.getEntityManager().addEntity(spawner);
      }
    }

    if (!anyEnemyMarker) {
      console.warn(
        "MapManager: authored world map has no enemy spawn tiles (spawns layer ids 2–6); open-world zombie fixtures are disabled.",
      );
    }
  }

  private seedItemSpawnPointsFromAuthoredLayer(): void {
    const totalSize = BIOME_SIZE * MAP_SIZE;

    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        const id = this.spawnLayer[y][x];
        if (!isItemSpawnTile(id)) {
          continue;
        }
        const itemType = spawnTileIdToItemFixtureType(id);
        if (!itemType) {
          continue;
        }

        const meta = this.authoredSpawnerMeta.find((e) => e.row === y && e.col === x);
        const respawnOverrideMs =
          meta?.respawnIntervalSec !== undefined
            ? Math.round(meta.respawnIntervalSec * 1000)
            : undefined;
        const spawner = new ItemSpawnPoint(
          this.getGameManagers(),
          itemType,
          x,
          y,
          true,
          respawnOverrideMs,
        );
        this.getEntityManager().addEntity(spawner);
      }
    }
  }

  private seedDialogueSurvivorNpcsFromAuthoredLayer(): void {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const byKey = new Map<string, WorldMapDialogueNpcEntry>();
    for (const e of this.authoredDialogueNpcs) {
      byKey.set(`${e.row},${e.col}`, e);
    }

    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (!isNpcDialogueSpawnTile(this.spawnLayer[y][x])) {
          continue;
        }
        const entry = byKey.get(`${y},${x}`);
        const fallback: WorldMapDialogueNpcEntry = {
          row: y,
          col: x,
          lines: ["…"],
          message: "…",
        };
        const npc = new DialogueSurvivorNpc(this.getGameManagers(), entry ?? fallback, x, y);
        this.getEntityManager().addEntity(npc);
      }
    }
  }

  /** Procedural campsite: fire at legacy local tile (8,7) inside the biome. */
  private spawnCampsiteFireAtBiome(biomeX: number, biomeY: number) {
    const tx = biomeX * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_X;
    const ty = biomeY * BIOME_SIZE + CAMPSITE_CAMPFIRE_LOCAL_Y;
    this.spawnCampsiteFireAtTile(tx, ty);
  }

  /** Tile indices: `tileX` = column, `tileY` = row (matches `groundLayer[tileY][tileX]`). */
  private spawnCampsiteFireAtTile(tileX: number, tileY: number) {
    const campsiteFire = new CampsiteFire(this.getGameManagers());
    campsiteFire
      .getExt(Positionable)
      .setPosition(
        PoolManager.getInstance().vector2.claim(
          tileX * getConfig().world.TILE_SIZE,
          tileY * getConfig().world.TILE_SIZE,
        ),
      );
    this.getEntityManager().addEntity(campsiteFire);
  }

  private spawnLightDecalEntitiesFromDecalsLayer(): void {
    const n = BIOME_SIZE * MAP_SIZE;
    const TILE_SIZE = getConfig().world.TILE_SIZE;
    const poolManager = PoolManager.getInstance();
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.decalsLayer[y]?.[x] !== DECAL_TILE_LIGHT) {
          continue;
        }
        const lightDecal = new LightDecal(this.getGameManagers());
        lightDecal
          .getExt(Positionable)
          .setPosition(poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE));
        this.getEntityManager().addEntity(lightDecal);
      }
    }
  }

  private spawnMessageDecalEntitiesFromDecalsLayer(): void {
    const byKey = new Map<string, WorldMapMessageDecalEntry>();
    for (const e of this.authoredMessageDecals) {
      byKey.set(`${e.row},${e.col}`, e);
    }
    const n = BIOME_SIZE * MAP_SIZE;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (this.decalsLayer[y]?.[x] !== DECAL_TILE_MESSAGE) {
          continue;
        }
        const entry = byKey.get(`${y},${x}`);
        const fallback: WorldMapMessageDecalEntry = { row: y, col: x, lines: ["Read me."] };
        const lines = getMessageDecalLines(entry ?? fallback);
        const decal = new MessageDecal(this.getGameManagers(), lines, x, y);
        this.getEntityManager().addEntity(decal);
      }
    }
  }

  /**
   * Checks if a biome position is adjacent to (within 1 tile of) the campsite
   * This is used to enforce a forest-only zone around the campsite
   */
  private isNearCampsite(biomeX: number, biomeY: number): boolean {
    const distance =
      Math.abs(biomeX - this.campsiteBiomeX) + Math.abs(biomeY - this.campsiteBiomeY);
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
    const validPositions: { x: number; y: number }[] = [];

    // Collect all valid biome positions (not edges, not center, not near campsite, not excluded, not adjacent to special biomes)
    for (let biomeY = 1; biomeY < MAP_SIZE - 1; biomeY++) {
      for (let biomeX = 1; biomeX < MAP_SIZE - 1; biomeX++) {
        // Skip the campsite biome
        if (biomeX === this.campsiteBiomeX && biomeY === this.campsiteBiomeY) {
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
      const randomIndex = Math.floor(this.mapRandom() * validPositions.length);
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

    const campsiteMinX = this.campsiteBiomeX * BIOME_SIZE;
    const campsiteMaxX = (this.campsiteBiomeX + 1) * BIOME_SIZE;
    const campsiteMinY = this.campsiteBiomeY * BIOME_SIZE;
    const campsiteMaxY = (this.campsiteBiomeY + 1) * BIOME_SIZE;

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
          if (this.mapRandom() < IDLE_ZOMBIE_SPAWN_CHANCE) {
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

  private isOpenWorldMode(): boolean {
    return (
      this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy().getConfig()
        .modeId === "open_world"
    );
  }

  /**
   * Collects map tiles eligible for open-world fixture zombies (same rules as spawnIdleZombies).
   */
  private collectEligibleOpenWorldZombieTiles(): { x: number; y: number }[] {
    const totalSize = BIOME_SIZE * MAP_SIZE;
    const campsiteMinX = this.campsiteBiomeX * BIOME_SIZE;
    const campsiteMaxX = (this.campsiteBiomeX + 1) * BIOME_SIZE;
    const campsiteMinY = this.campsiteBiomeY * BIOME_SIZE;
    const campsiteMaxY = (this.campsiteBiomeY + 1) * BIOME_SIZE;

    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        if (x >= campsiteMinX && x < campsiteMaxX && y >= campsiteMinY && y < campsiteMaxY) {
          continue;
        }
        const groundTile = this.groundLayer[y][x];
        const isValidGround =
          groundTile === GROUND_TILE_ID_1 ||
          groundTile === GROUND_TILE_ID_2 ||
          groundTile === GROUND_TILE_ID_3 ||
          groundTile === GROUND_TILE_ID_4;
        if (!isValidGround || this.collidablesLayer[y][x] !== EMPTY_COLLIDABLE_TILE_ID) {
          continue;
        }
        out.push({ x, y });
      }
    }
    return out;
  }

  private shuffleTileCoords(tiles: { x: number; y: number }[]): void {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(this.mapRandom() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
  }

  private pickTilesWithMinChebyshevSeparation(
    orderedCandidates: { x: number; y: number }[],
    maxCount: number,
    minSep: number,
  ): { x: number; y: number }[] {
    const picked: { x: number; y: number }[] = [];
    for (const t of orderedCandidates) {
      if (picked.length >= maxCount) break;
      const ok = picked.every(
        (p) => Math.max(Math.abs(p.x - t.x), Math.abs(p.y - t.y)) >= minSep,
      );
      if (ok) picked.push(t);
    }
    return picked;
  }

  private seedOpenWorldZombieSpawnPoints(): void {
    const world = getConfig().world;
    const want = world.OPEN_WORLD_ZOMBIE_SPAWN_POINT_COUNT;
    const minSep = world.OPEN_WORLD_ZOMBIE_SPAWN_MIN_TILE_SEPARATION;

    let candidates = this.collectEligibleOpenWorldZombieTiles();
    this.shuffleTileCoords(candidates);
    const chosen = this.pickTilesWithMinChebyshevSeparation(candidates, want, minSep);

    const poolManager = PoolManager.getInstance();
    const TILE_SIZE = world.TILE_SIZE;

    for (const { x, y } of chosen) {
      const position = poolManager.vector2.claim(x * TILE_SIZE, y * TILE_SIZE);
      if (!this.isPositionValidForPlacement(position, true)) {
        poolManager.vector2.release(position);
        continue;
      }
      poolManager.vector2.release(position);
      const spawner = new ZombieSpawnPoint(this.getGameManagers(), "regular", x, y, false);
      this.getEntityManager().addEntity(spawner);
    }
  }

  /**
   * Authored maps: same checks as fixture placement as player spawn markers — trust spawns layer +
   * collidables + entity overlap, without restricting to the four procedural grass tile IDs.
   */
  public isAuthoredZombieFixtureSpawnValid(
    position: Vector2,
    checkEntities: boolean = true,
    entitySize?: number,
  ): boolean {
    const { TILE_SIZE } = getConfig().world;
    const size = entitySize ?? TILE_SIZE;
    const gridX = Math.floor(position.x / TILE_SIZE);
    const gridY = Math.floor(position.y / TILE_SIZE);
    const totalSize = BIOME_SIZE * MAP_SIZE;

    if (gridY < 0 || gridY >= totalSize || gridX < 0 || gridX >= totalSize) {
      return false;
    }

    if (this.collidablesLayer[gridY]?.[gridX] !== EMPTY_COLLIDABLE_TILE_ID) {
      return false;
    }

    if (this.doesPositionOverlapWithCar(position)) {
      return false;
    }

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

  private spawnSurvivorsInBiome(biomeX: number, biomeY: number): void {
    if (!ENABLE_SURVIVOR_SPAWNS) {
      return;
    }
    // Spawn 1-2 survivors randomly
    const survivorCount =
      this.mapRandom() < SURVIVOR_SPAWN_PROBABILITY ? SURVIVOR_MIN_COUNT : SURVIVOR_MAX_COUNT;

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
      const randomIndex = Math.floor(this.mapRandom() * validPositions.length);
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
    if (!ENABLE_SURVIVOR_SPAWNS) {
      return false;
    }
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
    if (!ENABLE_GROUND_ITEM_SPAWNS) {
      return;
    }
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
      const randomIndex = Math.floor(this.mapRandom() * validPositions.length);
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
    if (biomeX === this.campsiteBiomeX && biomeY === this.campsiteBiomeY) {
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
      biome = forestBiomes[Math.floor(this.mapRandom() * forestBiomes.length)];
    }

    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = biomeY * BIOME_SIZE + y;
        const mapX = biomeX * BIOME_SIZE + x;
        this.groundLayer[mapY][mapX] = biome.ground[y][x];
        this.collidablesLayer[mapY][mapX] = biome.collidables[y][x];
      }
    }

    if (biome === CAMPSITE) {
      this.spawnCampsiteFireAtBiome(biomeX, biomeY);
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
    const validPositions: Vector2[] = [];

    // Collect all valid ground tile positions (excluding campsite biome)
    for (let y = 0; y < totalSize; y++) {
      for (let x = 0; x < totalSize; x++) {
        // Check if this tile is in the campsite biome - skip if so
        const biomeX = Math.floor(x / BIOME_SIZE);
        const biomeY = Math.floor(y / BIOME_SIZE);
        if (biomeX === this.campsiteBiomeX && biomeY === this.campsiteBiomeY) {
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
    const validPositions: Vector2[] = [];

    // Iterate through the campsite biome tiles
    for (let y = 0; y < BIOME_SIZE; y++) {
      for (let x = 0; x < BIOME_SIZE; x++) {
        const mapY = this.campsiteBiomeY * BIOME_SIZE + y;
        const mapX = this.campsiteBiomeX * BIOME_SIZE + x;
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

        const biomeX = this.campsiteBiomeX + dx;
        const biomeY = this.campsiteBiomeY + dy;

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
