import { GameClient } from "@/client";
import { DEBUG_MAP_BOUNDS } from "@shared/debug";
import { ClientIlluminated, ClientPositionable } from "@/extensions";
import { TILE_IDS } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";
import { RENDER_CONFIG } from "@/constants/constants";

const tileLocations: Record<string, [number, number]> = {
  [TILE_IDS.GRASS1]: [4 * 16, 0],
  [TILE_IDS.GRASS2]: [3 * 16, 2 * 16],
  [TILE_IDS.FOREST]: [8 * 16, 2 * 16],
  [TILE_IDS.WATER]: [9 * 16, 2 * 16],
};

const DARKNESS_RATE = 1.8; // lower the darker
const PULSE_SPEED = 0.001; // Speed of the pulse (lower = slower)
const PULSE_INTENSITY = 0.07; // How much the light radius varies (0.0 to 1.0)
const BASE_NIGHT_DARKNESS = 1.95; // Maximum darkness during night
const DARKNESS_EXPONENTIAL = 2.5; // Higher values make darkness increase more rapidly near night

interface LightSource {
  position: Vector2;
  radius: number;
}

export class MapManager {
  private tileSize = 16;
  private map: number[][] | null = null;
  private tilesheet = new Image();
  private gameClient: GameClient;
  private lastRenderTime: number;

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
    this.tilesheet.src = "/tiles.png";
    this.tilesheet.onload = () => {
      // this.columns = Math.floor(this.tilesheet.width / this.tileSize);
    };
    this.lastRenderTime = Date.now();
  }

  setMap(map: number[][]) {
    this.map = map;
  }

  getMap(): number[][] | null {
    return this.map;
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
    if (!this.map) return;

    const lightSources = this.getLightSources();
    const gameState = this.gameClient.getGameState();

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

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tileX = x * this.tileSize;
        const tileY = y * this.tileSize;
        const tileCenter = new Vector2(tileX + this.tileSize / 2, tileY + this.tileSize / 2);

        let minOpacity = 1;

        // Calculate light source effects
        for (const source of lightSources) {
          const dist = distance(source.position, tileCenter);
          if (dist > source.radius) continue;

          const opacity = Math.pow(dist / source.radius, DARKNESS_RATE);
          minOpacity = Math.min(minOpacity, opacity);
        }

        // Combine base darkness with light source effects
        // Light sources should reduce the darkness, so we multiply them
        const finalOpacity = baseDarkness * minOpacity;

        if (finalOpacity <= 0) continue;

        ctx.fillStyle = `rgba(0, 0, 0, ${finalOpacity})`;
        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.map) {
      return;
    }

    const player = this.gameClient.getMyPlayer();
    if (!player || !player.hasExt(ClientPositionable)) {
      return;
    }

    const playerPos = player.getExt(ClientPositionable).getCenterPosition();

    // Calculate the visible area in tile coordinates using ENTITY_RENDER_RADIUS
    const startTileX = Math.max(
      0,
      Math.floor((playerPos.x - RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
    );
    const startTileY = Math.max(
      0,
      Math.floor((playerPos.y - RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
    );
    const endTileX = Math.min(
      this.map[0].length - 1,
      Math.ceil((playerPos.x + RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
    );
    const endTileY = Math.min(
      this.map.length - 1,
      Math.ceil((playerPos.y + RENDER_CONFIG.ENTITY_RENDER_RADIUS) / this.tileSize)
    );

    // Only render tiles within the visible range
    for (let y = startTileY; y <= endTileY; y++) {
      for (let x = startTileX; x <= endTileX; x++) {
        if (y < 0 || y >= this.map.length || x < 0 || x >= this.map[y].length) continue;

        const cell = this.map[y][x];
        ctx.drawImage(
          this.tilesheet,
          tileLocations[cell][0],
          tileLocations[cell][1],
          this.tileSize,
          this.tileSize,
          x * this.tileSize,
          y * this.tileSize,
          this.tileSize,
          this.tileSize
        );

        if (DEBUG_MAP_BOUNDS) {
          // Draw row,col text
          ctx.font = "3px Arial";
          ctx.fillStyle = "white";
          ctx.textAlign = "left";
          ctx.fillText(`${y},${x}`, x * this.tileSize + 1, y * this.tileSize + 3);

          // Draw a small 0 at the center of the tile
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
}
