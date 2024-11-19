export class MapManager {
  private tileSize = 32;

  private map: number[][] = [
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  ];

  constructor() {}

  render(ctx: CanvasRenderingContext2D) {
    this.map.forEach((row, y) => {
      row.forEach((cell, x) => {
        ctx.fillStyle = cell === 1 ? "#E3E3E3" : "black";
        ctx.fillRect(
          x * this.tileSize,
          y * this.tileSize,
          this.tileSize,
          this.tileSize
        );
      });
    });
  }
}
