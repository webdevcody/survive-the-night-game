import { GameClient } from "@/client";
import { DEBUG_MAP_BOUNDS } from "@shared/debug";
import { ClientIlluminated, ClientPositionable } from "@/extensions";
import { TILE_IDS } from "@shared/map";
import Vector2 from "@shared/util/vector2";
import { distance } from "@shared/util/physics";

const tileLocations: Record<string, [number, number]> = {
  [TILE_IDS.GRASS1]: [4 * 16, 0],
  [TILE_IDS.GRASS2]: [3 * 16, 2 * 16],
  [TILE_IDS.FOREST]: [8 * 16, 2 * 16],
  [TILE_IDS.WATER]: [9 * 16, 2 * 16],
};

// Higher values make darkness increase more quickly with distance (0.5 to 2.0 recommended)
const DARKNESS_RATE = 0.4;
const PULSE_SPEED = 0.001; // Speed of the pulse (lower = slower)
const PULSE_INTENSITY = 0.05; // How much the light radius varies (0.0 to 1.0)

interface LightSource {
  position: Vector2;
  radius: number;
}

export class MapManager {
  private tileSize = 16;
  private map: number[][] | null = null;
  private tilesheet = new Image();
  private client: GameClient;
  private lastRenderTime: number;

  constructor(client: GameClient) {
    this.client = client;
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
    const entities = this.client.getGameState().entities;
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
    if (lightSources.length === 0) return;

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        const tileX = x * this.tileSize;
        const tileY = y * this.tileSize;
        const tileCenter = new Vector2(tileX + this.tileSize / 2, tileY + this.tileSize / 2);

        let minOpacity = 1;
        for (const source of lightSources) {
          const dist = distance(source.position, tileCenter);
          if (dist > source.radius) continue;

          const opacity = Math.pow(dist / source.radius, DARKNESS_RATE);
          minOpacity = Math.min(minOpacity, opacity);
        }

        if (minOpacity <= 0) continue;

        ctx.fillStyle = `rgba(0, 0, 0, ${minOpacity})`;
        ctx.fillRect(tileX, tileY, this.tileSize, this.tileSize);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.map) {
      return;
    }

    this.map.forEach((row, y) => {
      row.forEach((cell, x) => {
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
      });
    });
  }
}
