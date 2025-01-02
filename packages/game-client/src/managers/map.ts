import { GameClient } from "@/client";
import { DEBUG_SHOW_HITBOXES } from "@survive-the-night/game-server/src/config";
import { TILE_IDS } from "@survive-the-night/game-server/src/managers/map-manager";
import { Vector2 } from "@survive-the-night/game-server/src/shared/physics";
import { Entity } from "@survive-the-night/game-server/src/shared/entities";
import { distance } from "@survive-the-night/game-server/src/shared/physics";
import Positionable from "@survive-the-night/game-server/src/shared/extensions/positionable";
import { Illuminated } from "@survive-the-night/game-server/src/shared/extensions";

const tileLocations: Record<string, [number, number]> = {
  [TILE_IDS.GRASS1]: [4 * 16, 0],
  [TILE_IDS.GRASS2]: [3 * 16, 2 * 16],
  [TILE_IDS.FOREST]: [8 * 16, 2 * 16],
  [TILE_IDS.WATER]: [9 * 16, 2 * 16],
};

// Higher values make darkness increase more quickly with distance (0.5 to 2.0 recommended)
const DARKNESS_RATE = 0.4;
const DEFAULT_LIGHT_RADIUS = 150;
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

  private getLightSources(): LightSource[] {
    const sources: LightSource[] = [];
    const entities = this.client.getGameState().entities;
    const currentTime = Date.now();
    const pulseOffset = Math.sin(currentTime * PULSE_SPEED);
    const radiusMultiplier = 1 + pulseOffset * PULSE_INTENSITY;

    // Add any other illuminated entities
    entities.forEach((entity) => {
      const gameEntity = entity as Entity;
      if (gameEntity.hasExt(Illuminated)) {
        const baseRadius = gameEntity.getExt(Illuminated).getRadius();
        const position = gameEntity.getExt(Positionable).getCenterPosition();
        sources.push({
          type: gameEntity.getType(),
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
        const tileCenter = {
          x: tileX + this.tileSize / 2,
          y: tileY + this.tileSize / 2,
        };

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

        if (DEBUG_SHOW_HITBOXES) {
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
