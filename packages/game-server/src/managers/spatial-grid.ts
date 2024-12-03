import { Positionable } from "..";
import { Entity } from "../shared/entities";
import { Vector2 } from "../shared/physics";

export class SpatialGrid {
  private cells: Map<string, Entity>[][] = [];
  private cellSize: number = 16;

  constructor(mapWidth: number, mapHeight: number) {
    const cols = Math.ceil(mapWidth / this.cellSize);
    const rows = Math.ceil(mapHeight / this.cellSize);

    for (let y = 0; y < rows; y++) {
      this.cells[y] = [];
      for (let x = 0; x < cols; x++) {
        this.cells[y][x] = new Map();
      }
    }
  }

  clear() {
    for (let y = 0; y < this.cells.length; y++) {
      for (let x = 0; x < this.cells[y].length; x++) {
        this.cells[y][x].clear();
      }
    }
  }

  addEntity(entity: Entity & Positionable) {
    const pos = entity.getPosition();
    const [cellX, cellY] = this.getCellCoords(pos);

    if (this.isValidCell(cellX, cellY)) {
      this.cells[cellY][cellX].set(entity.getId(), entity);
    }
  }

  private getCellCoords(position: Vector2): [number, number] {
    return [Math.floor(position.x / this.cellSize), Math.floor(position.y / this.cellSize)];
  }

  private isValidCell(x: number, y: number): boolean {
    return y >= 0 && y < this.cells.length && x >= 0 && x < this.cells[0].length;
  }

  getNearbyEntities(position: Vector2, radius: number = this.cellSize): Entity[] {
    const [cellX, cellY] = this.getCellCoords(position);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearby: Entity[] = [];

    for (let y = -cellRadius; y <= cellRadius; y++) {
      for (let x = -cellRadius; x <= cellRadius; x++) {
        const checkX = cellX + x;
        const checkY = cellY + y;

        if (this.isValidCell(checkX, checkY)) {
          this.cells[checkY][checkX].forEach((entity) => nearby.push(entity));
        }
      }
    }

    return nearby;
  }
}
