import { GameClient } from "@/client";
import { DEBUG_MAP_BOUNDS } from "@shared/debug";
import { ClientIlluminated, ClientPositionable } from "@/extensions";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { RENDER_CONFIG } from "@/constants/constants";

const PULSE_SPEED = 0.001; // Speed of the pulse (lower = slower)
const PULSE_INTENSITY = 0.07; // How much the light radius varies (0.0 to 1.0)
const BASE_NIGHT_DARKNESS = 1.95; // Maximum darkness during night
const DARKNESS_EXPONENTIAL = 2.5; // Higher values make darkness increase more rapidly near night
const PATH_ATTENUATION = 0.96; // Light retention on walkable tiles (per tile step)
const COLLIDABLE_ATTENUATION = 0.9; // Light retention through collidables (per tile step)
const MIN_LIGHT_INTENSITY = 0.01; // Threshold to stop BFS propagation
const DARKNESS_RENDER_DISTANCE = 400; // Maximum distance (in pixels) from player to render darkness tiles

interface LightSource {
  position: Vector2;
  radius: number;
}

interface LightSourceWithId extends LightSource {
  entityId: number;
}

export class MapManager {
  private tileSize = 16;
  private groundLayer: number[][] | null = null;
  private collidablesLayer: number[][] | null = null;

  // Light caching system
  private lightMapCache: Map<number, number[][]> = new Map(); // Cache per entity ID
  private lightSourcePositions: Map<number, { x: number; y: number }> = new Map(); // Grid positions per entity
  private combinedLightMap: number[][] = []; // Final combined light map
  private lastLightRecalculationTime: number = 0;
  private readonly LIGHT_RECALCULATION_INTERVAL = 300;

  private biomePositions?: {
    campsite: { x: number; y: number };
    farm?: { x: number; y: number };
    gasStation?: { x: number; y: number };
    city?: { x: number; y: number };
    dock?: { x: number; y: number };
    shed?: { x: number; y: number };
    merchants?: Array<{ x: number; y: number }>;
  };
  private groundTilesheet = new Image();
  private collidablesTilesheet = new Image();
  private gameClient: GameClient;
  private lastRenderTime: number;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.groundTilesheet.src = "/sheets/ground.png";
    this.collidablesTilesheet.src = "/sheets/collidables.png";
    this.lastRenderTime = Date.now();
  }

  setMap(mapData: { ground: number[][]; collidables: number[][]; biomePositions?: any }) {
    this.groundLayer = mapData.ground;
    this.collidablesLayer = mapData.collidables;
    this.biomePositions = mapData.biomePositions;
  }

  getMap(): number[][] | null {
    // Legacy method - returns ground layer for backward compatibility
    return this.groundLayer;
  }

  getMapData(): {
    ground: number[][] | null;
    collidables: number[][] | null;
    biomePositions?: any;
  } {
    return {
      ground: this.groundLayer,
      collidables: this.collidablesLayer,
      biomePositions: this.biomePositions,
    };
  }

  getBiomePositions():
    | {
        campsite: { x: number; y: number };
        farm?: { x: number; y: number };
        gasStation?: { x: number; y: number };
        city?: { x: number; y: number };
        dock?: { x: number; y: number };
        shed?: { x: number; y: number };
        merchants?: Array<{ x: number; y: number }>;
      }
    | undefined {
    return this.biomePositions;
  }

  // Convert world coordinates to tile indices
  private worldToTile(x: number, y: number): { row: number; col: number } {
    return {
      row: Math.floor(y / this.tileSize),
      col: Math.floor(x / this.tileSize),
    };
  }

  // Convert tile indices to world center coordinates
  private tileToWorld(row: number, col: number): { x: number; y: number } {
    return {
      x: col * this.tileSize + this.tileSize / 2,
      y: row * this.tileSize + this.tileSize / 2,
    };
  }

  // Check if tile coordinates are valid
  private isValidTile(row: number, col: number): boolean {
    if (!this.groundLayer) return false;
    return (
      row >= 0 && row < this.groundLayer.length && col >= 0 && col < this.groundLayer[0].length
    );
  }

  // Helper: Convert world position to grid tile coordinates
  private getGridPosition(position: Vector2): { x: number; y: number } {
    return {
      x: Math.floor(position.x / this.tileSize),
      y: Math.floor(position.y / this.tileSize),
    };
  }

  // Helper: Create empty light map with proper dimensions
  private createEmptyLightMap(): number[][] {
    if (!this.groundLayer) return [];
    const rows = this.groundLayer.length;
    const cols = this.groundLayer[0].length;
    return Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(0));
  }

  // Helper: Check if light source has moved to a different grid position
  private hasLightSourceMoved(entityId: number, currentPos: Vector2): boolean {
    const cachedPos = this.lightSourcePositions.get(entityId);
    if (!cachedPos) return true; // New light source

    const currentGrid = this.getGridPosition(currentPos);
    return cachedPos.x !== currentGrid.x || cachedPos.y !== currentGrid.y;
  }

  // Calculate light propagation for a single light source using BFS
  private calculateSingleLightPropagation(
    source: LightSource,
    rows: number,
    cols: number
  ): number[][] {
    if (!this.groundLayer || !this.collidablesLayer) {
      return Array(rows)
        .fill(0)
        .map(() => Array(cols).fill(0));
    }

    // Initialize light map with zeros for this source
    const lightMap = Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(0));

    const startTile = this.worldToTile(source.position.x, source.position.y);
    if (!this.isValidTile(startTile.row, startTile.col)) {
      return lightMap;
    }

    // BFS queue: {row, col, intensity}
    const queue: { row: number; col: number; intensity: number }[] = [];
    const visited = new Set<string>();

    queue.push({ row: startTile.row, col: startTile.col, intensity: 1.0 });
    visited.add(`${startTile.row},${startTile.col}`);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const { row, col, intensity } = current;

      // Calculate distance-based falloff for smooth gradient
      const currentWorldPos = this.tileToWorld(row, col);
      const distFromSource = distance(
        source.position,
        new Vector2(currentWorldPos.x, currentWorldPos.y)
      );

      // Apply smooth distance-based falloff (quadratic falloff for natural lighting)
      const distanceFactor = Math.max(0, 1 - Math.pow(distFromSource / source.radius, 2));
      const finalIntensity = intensity * distanceFactor;

      // Update light map for this source
      lightMap[row][col] = Math.max(lightMap[row][col], finalIntensity);

      // Stop propagation if intensity is too low or beyond radius
      if (finalIntensity < MIN_LIGHT_INTENSITY || distFromSource > source.radius) continue;

      // Explore 4 cardinal neighbors
      const neighbors = [
        { row: row - 1, col }, // North
        { row: row + 1, col }, // South
        { row, col: col - 1 }, // West
        { row, col: col + 1 }, // East
      ];

      for (const neighbor of neighbors) {
        if (!this.isValidTile(neighbor.row, neighbor.col)) continue;

        const key = `${neighbor.row},${neighbor.col}`;
        if (visited.has(key)) continue;

        // Calculate next intensity based on tile type
        const isCollidable = this.collidablesLayer[neighbor.row][neighbor.col] !== -1;
        const attenuation = isCollidable ? COLLIDABLE_ATTENUATION : PATH_ATTENUATION;
        const nextIntensity = intensity * attenuation;

        if (nextIntensity >= MIN_LIGHT_INTENSITY) {
          queue.push({ row: neighbor.row, col: neighbor.col, intensity: nextIntensity });
          visited.add(key);
        }
      }
    }

    return lightMap;
  }

  private getLightSources(): LightSourceWithId[] {
    const sources: LightSourceWithId[] = [];
    const entities = this.gameClient.getGameState().entities;
    const currentTime = Date.now();
    const pulseOffset = Math.sin(currentTime * PULSE_SPEED);
    const radiusMultiplier = 1 + pulseOffset * PULSE_INTENSITY;

    entities.forEach((entity, entityId) => {
      const gameEntity = entity;
      if (gameEntity.hasExt(ClientIlluminated)) {
        const baseRadius = gameEntity.getExt(ClientIlluminated).getRadius();
        const position = gameEntity.getExt(ClientPositionable).getCenterPosition();
        sources.push({
          entityId,
          position,
          radius: baseRadius * radiusMultiplier,
        });
      }
    });

    return sources;
  }

  // Update light cache with change detection and combine all light maps
  private updateLightCache(currentSources: LightSourceWithId[]): void {
    if (!this.groundLayer || !this.collidablesLayer) return;

    const rows = this.groundLayer.length;
    const cols = this.groundLayer[0].length;

    // Track current entity IDs
    const currentEntityIds = new Set(currentSources.map((s) => s.entityId));
    const previousEntityIds = new Set(this.lightSourcePositions.keys());

    // Step 1: Remove caches for deleted light sources
    for (const entityId of previousEntityIds) {
      if (!currentEntityIds.has(entityId)) {
        this.lightMapCache.delete(entityId);
        this.lightSourcePositions.delete(entityId);
      }
    }

    // Step 2: Update cache for new or moved light sources
    for (const source of currentSources) {
      const gridPos = this.getGridPosition(source.position);

      // Check if this light source needs recalculation
      if (this.hasLightSourceMoved(source.entityId, source.position)) {
        // Recalculate light map for this source
        const lightMap = this.calculateSingleLightPropagation(source, rows, cols);
        this.lightMapCache.set(source.entityId, lightMap);
        this.lightSourcePositions.set(source.entityId, gridPos);
      }
      // If not moved, the cached light map is still valid
    }

    // Step 3: Combine all cached light maps into combinedLightMap
    // Initialize combined map with zeros
    this.combinedLightMap = this.createEmptyLightMap();

    // Only combine light maps within visible range for performance
    const bounds = this.getVisibleTileBounds(DARKNESS_RENDER_DISTANCE);
    if (!bounds) {
      return;
    }

    const { startTileX, startTileY, endTileX, endTileY } = bounds;

    // Iterate through all cached light maps and combine them (only visible tiles)
    for (const [, lightMap] of this.lightMapCache) {
      for (let row = startTileY; row <= endTileY; row++) {
        for (let col = startTileX; col <= endTileX; col++) {
          // Take maximum intensity from all light sources
          this.combinedLightMap[row][col] = Math.max(
            this.combinedLightMap[row][col],
            lightMap[row][col]
          );
        }
      }
    }
  }

  renderDarkness(ctx: CanvasRenderingContext2D) {
    if (!this.groundLayer) return;

    const currentTime = Date.now();
    const timeSinceLastRecalc = currentTime - this.lastLightRecalculationTime;

    // Only recalculate light cache every LIGHT_RECALCULATION_INTERVAL ms (10Hz)
    if (timeSinceLastRecalc >= this.LIGHT_RECALCULATION_INTERVAL) {
      const lightSources = this.getLightSources();
      this.updateLightCache(lightSources);
      this.lastLightRecalculationTime = currentTime;
    }

    const gameState = this.gameClient.getGameState();

    // Calculate base darkness level based on day/night cycle
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const cycleProgress = elapsedTime / gameState.cycleDuration;

    let baseDarkness;
    if (gameState.isDay) {
      // During day, darkness increases exponentially from 0 to BASE_NIGHT_DARKNESS as we approach night
      const exponentialProgress = Math.pow(cycleProgress, DARKNESS_EXPONENTIAL);
      baseDarkness = exponentialProgress * BASE_NIGHT_DARKNESS;
    } else {
      // During night, maintain constant BASE_NIGHT_DARKNESS
      baseDarkness = BASE_NIGHT_DARKNESS;
    }

    const bounds = this.getVisibleTileBounds(DARKNESS_RENDER_DISTANCE);
    if (!bounds) return;

    const { startTileX, startTileY, endTileX, endTileY } = bounds;

    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        const lightIntensity = this.combinedLightMap[y]?.[x] || 0;
        const darkness = 1 - lightIntensity; // Convert light to darkness
        const finalOpacity = baseDarkness * darkness;

        if (finalOpacity <= 0) continue;

        const tileX = x * this.tileSize;
        const tileY = y * this.tileSize;
        ctx.fillStyle = `rgba(0, 0, 0, ${finalOpacity})`;
        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
      }
    }
  }

  // Helper to get visible tile bounds
  private getVisibleTileBounds(renderDistance?: number): {
    startTileX: number;
    startTileY: number;
    endTileX: number;
    endTileY: number;
  } | null {
    if (!this.groundLayer) return null;

    const player = this.gameClient.getMyPlayer();
    if (!player || !player.hasExt(ClientPositionable)) {
      return null;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();
    const distance = renderDistance ?? RENDER_CONFIG.ENTITY_RENDER_RADIUS;

    return {
      startTileX: Math.max(0, Math.floor((playerPos.x - distance) / this.tileSize)),
      startTileY: Math.max(0, Math.floor((playerPos.y - distance) / this.tileSize)),
      endTileX: Math.min(
        this.groundLayer[0].length - 1,
        Math.ceil((playerPos.x + distance) / this.tileSize)
      ),
      endTileY: Math.min(
        this.groundLayer.length - 1,
        Math.ceil((playerPos.y + distance) / this.tileSize)
      ),
    };
  }

  renderGround(ctx: CanvasRenderingContext2D) {
    if (!this.groundLayer) return;

    const bounds = this.getVisibleTileBounds();
    if (!bounds) return;

    const { startTileX, startTileY, endTileX, endTileY } = bounds;

    // Render ground tiles within visible range
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        if (y < 0 || y >= this.groundLayer.length || x < 0 || x >= this.groundLayer[y].length)
          continue;

        const groundTileId = this.groundLayer[y][x];
        const groundCols = this.groundTilesheet.width / this.tileSize;
        const col = groundTileId % groundCols;
        const row = Math.floor(groundTileId / groundCols);
        ctx.drawImage(
          this.groundTilesheet,
          col * this.tileSize,
          row * this.tileSize,
          this.tileSize,
          this.tileSize,
          x * this.tileSize,
          y * this.tileSize,
          this.tileSize,
          this.tileSize
        );
      }
    }
  }

  renderCollidables(ctx: CanvasRenderingContext2D) {
    if (!this.collidablesLayer) return;

    const bounds = this.getVisibleTileBounds();
    if (!bounds) return;

    const { startTileX, startTileY, endTileX, endTileY } = bounds;

    // Render collidable tiles (darkness will be applied later as an overlay)
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        if (
          y < 0 ||
          y >= this.collidablesLayer.length ||
          x < 0 ||
          x >= this.collidablesLayer[y].length
        )
          continue;

        const collidableTileId = this.collidablesLayer[y][x];
        if (collidableTileId === -1) continue;

        const collidablesCols = this.collidablesTilesheet.width / this.tileSize;
        const colCol = collidableTileId % collidablesCols;
        const colRow = Math.floor(collidableTileId / collidablesCols);
        ctx.drawImage(
          this.collidablesTilesheet,
          colCol * this.tileSize,
          colRow * this.tileSize,
          this.tileSize,
          this.tileSize,
          x * this.tileSize,
          y * this.tileSize,
          this.tileSize,
          this.tileSize
        );
      }
    }

    // Render debug overlays if enabled
    if (DEBUG_MAP_BOUNDS) {
      for (let y = startTileY; y <= endTileY; y++) {
        for (let x = startTileX; x <= endTileX; x++) {
          if (
            y < 0 ||
            y >= this.collidablesLayer.length ||
            x < 0 ||
            x >= this.collidablesLayer[y].length
          )
            continue;

          // Draw row,col text
          ctx.font = "3px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "left";
          ctx.fillText(`${y},${x}`, x * this.tileSize + 1, y * this.tileSize + 3);

          // Draw a small dot at the center of the tile
          ctx.font = "3px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "center";
          ctx.fillText(
            ".",
            x * this.tileSize + this.tileSize / 2,
            y * this.tileSize + this.tileSize / 2
          );

          // Draw white rectangle border around tile
          ctx.strokeStyle = "white";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
        }
      }
    }
  }

  // Legacy method for backward compatibility
  render(ctx: CanvasRenderingContext2D) {
    this.renderGround(ctx);
    this.renderCollidables(ctx);
  }
}
