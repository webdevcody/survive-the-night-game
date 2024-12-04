import { DEBUG } from "@survive-the-night/game-server";
import { TILE_IDS } from "@survive-the-night/game-server/src/managers/map-manager";

const tileLocations: Record<string, [number, number]> = {
  [TILE_IDS.GRASS1]: [4 * 16, 0],
  [TILE_IDS.GRASS2]: [3 * 16, 2 * 16],
  [TILE_IDS.FOREST]: [8 * 16, 2 * 16],
  [TILE_IDS.WATER]: [9 * 16, 2 * 16],
};

export class MapManager {
  private tileSize = 16;

  private map: number[][] | null = null;

  private tilesheet = new Image();

  constructor() {
    this.tilesheet.src = "/tiles.png";
    this.tilesheet.onload = () => {
      // this.columns = Math.floor(this.tilesheet.width / this.tileSize);
    };
  }

  setMap(map: number[][]) {
    this.map = map;
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

        if (DEBUG) {
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
