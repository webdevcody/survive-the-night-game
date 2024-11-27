const tileLocations: Record<string, [number, number]> = {
  ["0"]: [4 * 16, 0],
  ["1"]: [3 * 16, 2 * 16],
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
      });
    });
  }
}
