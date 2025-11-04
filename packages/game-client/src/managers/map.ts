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

interface LightSource {
  position: Vector2;
  radius: number;
}

export class MapManager {
  private tileSize = 16;
  private groundLayer: number[][] | null = null;
  private collidablesLayer: number[][] | null = null;
  private lightMap: number[][] = []; // Stores light intensity per tile (0.0 to 1.0)
  private biomePositions?: {
    campsite: { x: number; y: number };
    farm?: { x: number; y: number };
    gasStation?: { x: number; y: number };
    city?: { x: number; y: number };
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

  getBiomePositions() {
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

  // Calculate light propagation using BFS
  private calculateLightPropagation(sources: LightSource[]): void {
    if (!this.groundLayer || !this.collidablesLayer) return;

    const rows = this.groundLayer.length;
    const cols = this.groundLayer[0].length;

    // Initialize lightMap with zeros
    this.lightMap = Array(rows)
      .fill(0)
      .map(() => Array(cols).fill(0));

    // Process each light source
    for (const source of sources) {
      const startTile = this.worldToTile(source.position.x, source.position.y);
      if (!this.isValidTile(startTile.row, startTile.col)) continue;

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

        // Update light map with maximum intensity from any source
        this.lightMap[row][col] = Math.max(this.lightMap[row][col], finalIntensity);

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
    }
  }

  private getLightSources(): LightSource[] {
    const sources: LightSource[] = [];
    const entities = this.gameClient.getGameState().entities;
    const currentTime = Date.now();
    const pulseOffset = Math.sin(currentTime * PULSE_SPEED);
    const radiusMultiplier = 1 + pulseOffset * PULSE_INTENSITY;

    entities.forEach((entity) => {
      const gameEntity = entity;
      if (gameEntity.hasExt(ClientIlluminated)) {
        const baseRadius = gameEntity.getExt(ClientIlluminated).getRadius();
        const position = gameEntity.getExt(ClientPositionable).getCenterPosition();
        sources.push({
          position,
          radius: baseRadius * radiusMultiplier,
        });
      }
    });

    return sources;
  }

  renderDarkness(ctx: CanvasRenderingContext2D) {
    if (!this.groundLayer) return;

    const lightSources = this.getLightSources();
    const gameState = this.gameClient.getGameState();

    // Calculate light propagation once per frame using BFS
    this.calculateLightPropagation(lightSources);

    // Calculate base darkness level based on day/night cycle
    const currentTime = Date.now();
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

    // Render darkness overlay based on pre-calculated lightMap
    for (let y = 0; y < this.groundLayer.length; y++) {
      for (let x = 0; x < this.groundLayer[y].length; x++) {
        const lightIntensity = this.lightMap[y]?.[x] || 0;
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
  private getVisibleTileBounds(): {
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

    return {
      startTileX: Math.max(
        0,
        Math.floor((playerPos.x - RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
      ),
      startTileY: Math.max(
        0,
        Math.floor((playerPos.y - RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
      ),
      endTileX: Math.min(
        this.groundLayer[0].length - 1,
        Math.ceil((playerPos.x + RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
      ),
      endTileY: Math.min(
        this.groundLayer.length - 1,
        Math.ceil((playerPos.y + RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
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
