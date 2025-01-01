import { GameClient } from "@/client";
import { Collidable, Positionable } from "@survive-the-night/game-server";
import { DEBUG_SHOW_HITBOXES } from "@survive-the-night/game-server/src/config";
import { TILE_IDS } from "@survive-the-night/game-server/src/managers/map-manager";

const tileLocations: Record<string, [number, number]> = {
  [TILE_IDS.GRASS1]: [4 * 16, 0],
  [TILE_IDS.GRASS2]: [3 * 16, 2 * 16],
  [TILE_IDS.FOREST]: [8 * 16, 2 * 16],
  [TILE_IDS.WATER]: [9 * 16, 2 * 16],
};

// Higher values make darkness increase more quickly with distance (0.5 to 2.0 recommended)
const DARKNESS_RATE = 0.4;

export class MapManager {
  private tileSize = 16;

  private map: number[][] | null = null;

  private tilesheet = new Image();

  private client: GameClient;

  constructor(client: GameClient) {
    this.client = client;
    this.tilesheet.src = "/tiles.png";
    this.tilesheet.onload = () => {
      // this.columns = Math.floor(this.tilesheet.width / this.tileSize);
    };
  }

  setMap(map: number[][]) {
    this.map = map;
  }

  renderDarkness(ctx: CanvasRenderingContext2D) {
    const player = this.client.getMyPlayer();
    if (!player || !this.map) {
      return;
    }

    const playerPosition = player.getExt(Positionable).getPosition();
    const maxViewDistance = 300;

    // Calculate the visible range in tiles
    const tilesInView = Math.ceil(maxViewDistance / this.tileSize);
    const playerTileX = Math.floor(playerPosition.x / this.tileSize);
    const playerTileY = Math.floor(playerPosition.y / this.tileSize);

    // Render darkness tiles
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        // Calculate distance from player in tiles
        const dx = x - playerTileX;
        const dy = y - playerTileY;
        const distanceInTiles = Math.sqrt(dx * dx + dy * dy);

        // Skip tiles that are too far to be visible
        if (distanceInTiles > tilesInView) {
          continue;
        }

        // Calculate opacity based on distance with darkness rate
        const distance = distanceInTiles * this.tileSize;
        let opacity = Math.pow(distance / maxViewDistance, DARKNESS_RATE);
        opacity = Math.min(Math.max(opacity, 0), 1); // Clamp between 0 and 1

        // Draw black tile with calculated opacity
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
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
