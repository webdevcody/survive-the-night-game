import { IEnvironmentalEventStrategy } from "../environmental-event-strategy";
import { EntityManager } from "../entity-manager";
import { MapManager } from "@/world/map-manager";
import { IGameManagers } from "../types";
import { environmentalEventsConfig } from "@shared/config/environmental-events-config";
import { ToxicGasCloud } from "@/entities/environment/toxic-gas-cloud";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { BIOME_SIZE, MAP_SIZE } from "@/world/map-manager";
import { getConfig } from "@shared/config";
import { GameMessageEvent } from "@shared/events/server-sent/events/game-message-event";
import Positionable from "@/extensions/positionable";

/**
 * Strategy for managing toxic gas environmental events
 */
export class ToxicGasEventStrategy implements IEnvironmentalEventStrategy {
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private gameManagers: IGameManagers;
  private active: boolean = false;
  private toxicGasClouds: ToxicGasCloud[] = [];
  // 2D grid tracking occupied tiles: Map<"tileX,tileY", true>
  private occupiedTiles: Set<string> = new Set();
  private readonly TILE_SIZE = getConfig().world.TILE_SIZE;

  constructor(
    gameManagers: IGameManagers,
    entityManager: EntityManager,
    mapManager: MapManager
  ) {
    this.gameManagers = gameManagers;
    this.entityManager = entityManager;
    this.mapManager = mapManager;
  }

  public onWaveComplete(completedWaveNumber: number): void {
    // End current event if active
    if (this.active) {
      this.end();
    }

    // Check if we should trigger toxic gas event
    if (this.shouldTriggerToxicGas(completedWaveNumber)) {
      this.start();
    }
  }

  public onWaveStart(): void {
    // End toxic gas event when wave starts
    if (this.active) {
      this.end();
    }
  }

  public update(deltaTime: number): void {
    if (!this.active) return;

    // Clean up removed clouds from tracking and grid
    const removedClouds: Array<{ cloud: ToxicGasCloud; position: Vector2 | null }> = [];

    this.toxicGasClouds = this.toxicGasClouds.filter((cloud) => {
      const entity = this.entityManager.getEntityById(cloud.getId());
      if (entity === null || entity.isMarkedForRemoval()) {
        // Get position before entity is removed
        let position: Vector2 | null = null;
        if (entity && entity.hasExt(Positionable)) {
          position = entity.getExt(Positionable).getPosition();
        }
        removedClouds.push({ cloud, position });
        return false;
      }
      return true;
    });

    // Remove tiles from grid for removed clouds
    for (const { position } of removedClouds) {
      if (position) {
        const { tileX, tileY } = this.worldToTile(position);
        this.occupiedTiles.delete(this.getTileKey(tileX, tileY));
      }
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public end(): void {
    this.active = false;

    // Remove all clouds when event ends
    for (const cloud of this.toxicGasClouds) {
      const entity = this.entityManager.getEntityById(cloud.getId());
      if (entity) {
        this.entityManager.removeEntity(cloud.getId());
      }
    }

    // Clear tracking arrays and grid
    this.toxicGasClouds = [];
    this.occupiedTiles.clear();

    console.log(`[EnvironmentalEvent] Toxic gas event ended - removed all clouds`);
  }

  private shouldTriggerToxicGas(completedWaveNumber: number): boolean {
    const config = environmentalEventsConfig.TOXIC_GAS;
    if (completedWaveNumber + 1 < config.MIN_WAVE) {
      return false;
    }
    return Math.random() < config.TRIGGER_CHANCE;
  }

  /**
   * Start toxic gas event
   */
  private start(): void {
    this.active = true;
    this.toxicGasClouds = [];
    this.occupiedTiles.clear(); // Clear grid when starting new event

    const config = environmentalEventsConfig.TOXIC_GAS;
    const cloudCount =
      Math.floor(Math.random() * (config.CLOUD_COUNT.max - config.CLOUD_COUNT.min + 1)) +
      config.CLOUD_COUNT.min;

    // Get spawn positions from biomes surrounding campsite
    const spawnPositions = this.generateSpawnPositionsFromBiomes(cloudCount);

    for (const position of spawnPositions) {
      const cloud = new ToxicGasCloud(this.gameManagers, position);
      cloud.setEnvironmentalEventManager(this); // Set reference for growth requests
      this.entityManager.addEntity(cloud);
      this.toxicGasClouds.push(cloud);
      // Mark tile as occupied
      this.markTileOccupied(position);
    }

    // Broadcast message to all players
    this.gameManagers.getBroadcaster().broadcastEvent(
      new GameMessageEvent({
        message: "Toxic Gas has been spotted!",
        color: "red",
      })
    );

    console.log(`[EnvironmentalEvent] Toxic gas event started with ${cloudCount} clouds`);
  }

  /**
   * Convert world position to tile coordinates
   */
  private worldToTile(position: Vector2): { tileX: number; tileY: number } {
    return {
      tileX: Math.floor(position.x / this.TILE_SIZE),
      tileY: Math.floor(position.y / this.TILE_SIZE),
    };
  }

  /**
   * Get tile key for Set lookup
   */
  private getTileKey(tileX: number, tileY: number): string {
    return `${tileX},${tileY}`;
  }

  /**
   * Mark a tile as occupied
   */
  private markTileOccupied(position: Vector2): void {
    const { tileX, tileY } = this.worldToTile(position);
    this.occupiedTiles.add(this.getTileKey(tileX, tileY));
  }

  /**
   * Check if a tile is occupied
   */
  public isTileOccupied(position: Vector2): boolean {
    const { tileX, tileY } = this.worldToTile(position);
    return this.occupiedTiles.has(this.getTileKey(tileX, tileY));
  }

  /**
   * Request to spawn a new cloud at a position (checks grid first)
   * Returns true if cloud was spawned, false if position was occupied
   */
  public requestSpawnCloud(
    position: Vector2,
    isOriginalCloud: boolean,
    canReproduce: boolean,
    primaryDirection: { x: number; y: number }
  ): boolean {
    // Check if tile is already occupied
    if (this.isTileOccupied(position)) {
      return false;
    }

    // Spawn cloud and mark tile as occupied
    const cloud = new ToxicGasCloud(this.gameManagers, position);
    cloud.setEnvironmentalEventManager(this); // Set reference for growth requests
    cloud.setIsOriginalCloud(isOriginalCloud);
    cloud.setCanReproduce(canReproduce);
    cloud.setPrimaryDirection(primaryDirection);
    this.entityManager.addEntity(cloud);
    this.toxicGasClouds.push(cloud);
    this.markTileOccupied(position);

    return true;
  }

  /**
   * Generate spawn positions for clouds from biomes surrounding campsite
   */
  private generateSpawnPositionsFromBiomes(count: number): Vector2[] {
    const positions: Vector2[] = [];

    // Get center positions of biomes surrounding campsite
    const biomeCenters = this.mapManager.getCampsiteSurroundingBiomeCenters();

    if (biomeCenters.length === 0) {
      console.warn(
        "[EnvironmentalEvent] No biomes found around campsite, falling back to random spawn"
      );
      return this.generateSpawnPositions(
        count,
        environmentalEventsConfig.TOXIC_GAS.SPAWN_MIN_DISTANCE
      );
    }

    // Randomly select biome centers for cloud spawns
    const selectedBiomes: Vector2[] = [];
    const availableBiomes = [...biomeCenters];

    for (let i = 0; i < count && availableBiomes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableBiomes.length);
      const selectedBiome = availableBiomes[randomIndex];
      selectedBiomes.push(selectedBiome);
      availableBiomes.splice(randomIndex, 1); // Remove to avoid duplicates
    }

    return selectedBiomes;
  }

  /**
   * Generate spawn positions for clouds with minimum distance between them (fallback)
   */
  private generateSpawnPositions(count: number, minDistance: number): Vector2[] {
    const positions: Vector2[] = [];
    const tileSize = getConfig().world.TILE_SIZE;
    const mapSize = BIOME_SIZE * MAP_SIZE * tileSize;
    const maxAttempts = 100;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let validPosition = false;
      let position: Vector2 | null = null;

      while (!validPosition && attempts < maxAttempts) {
        attempts++;
        const poolManager = PoolManager.getInstance();
        position = poolManager.vector2.claim(Math.random() * mapSize, Math.random() * mapSize);

        // Check if position is far enough from existing positions
        validPosition = true;
        for (const existingPos of positions) {
          const dx = position.x - existingPos.x;
          const dy = position.y - existingPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance) {
            validPosition = false;
            break;
          }
        }

        // Check if position is on walkable tile (basic check - avoid edges)
        if (validPosition) {
          const margin = tileSize * 2;
          if (
            position.x < margin ||
            position.x > mapSize - margin ||
            position.y < margin ||
            position.y > mapSize - margin
          ) {
            validPosition = false;
          }
        }
      }

      if (position && validPosition) {
        positions.push(position);
      }
    }

    return positions;
  }

  /**
   * Get all active toxic gas clouds
   */
  public getToxicGasClouds(): ToxicGasCloud[] {
    return this.toxicGasClouds;
  }
}

