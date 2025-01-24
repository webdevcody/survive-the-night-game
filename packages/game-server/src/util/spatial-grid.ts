import { Entity } from "@/entities/entity";
import Positionable from "@/extensions/positionable";
import Vector2 from "@/util/vector2";
import { EntityType } from "@shared/types/entity";

export class SpatialGrid {
  private cells: Map<string, Entity>[][] = [];
  private cellSize: number = 16;
  private rowLength: number;
  private colLength: number;

  constructor(mapWidth: number, mapHeight: number) {
    const cols = Math.ceil(mapWidth / this.cellSize);
    const rows = Math.ceil(mapHeight / this.cellSize);
    this.rowLength = rows;
    this.colLength = cols;

    for (let y = 0; y < rows; y++) {
      this.cells[y] = [];
      for (let x = 0; x < cols; x++) {
        this.cells[y][x] = new Map();
      }
    }
  }

  clear() {
    for (let y = 0; y < this.rowLength; y++) {
      for (let x = 0; x < this.colLength; x++) {
        this.cells[y][x].clear();
      }
    }
  }

  addEntity(entity: Entity) {
    const pos = entity.getExt(Positionable).getCenterPosition();
    const cellX = (pos.x / this.cellSize) | 0; // Bitwise OR with 0 is faster than Math.floor
    const cellY = (pos.y / this.cellSize) | 0;

    if (this.isValidCell(cellX, cellY)) {
      this.cells[cellY][cellX].set(entity.getId(), entity);
    }
  }

  private getCellCoords(position: Vector2): [number, number] {
    return [Math.floor(position.x / this.cellSize), Math.floor(position.y / this.cellSize)];
  }

  private isValidCell(x: number, y: number): boolean {
    return y >= 0 && y < this.rowLength && x >= 0 && x < this.colLength;
  }

  getNearbyEntities(
    position: Vector2,
    radius: number = this.cellSize,
    filter?: EntityType[]
  ): Entity[] {
    const [cellX, cellY] = this.getCellCoords(position);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearby: Entity[] = [];

    for (let y = -cellRadius; y <= cellRadius; y++) {
      for (let x = -cellRadius; x <= cellRadius; x++) {
        const checkX = cellX + x;
        const checkY = cellY + y;

        if (this.isValidCell(checkX, checkY)) {
          this.cells[checkY][checkX].forEach((entity) => {
            if (filter && !filter.includes(entity.getType())) {
              return;
            }
            nearby.push(entity);
          });
        }
      }
    }

    return nearby;
  }
}
