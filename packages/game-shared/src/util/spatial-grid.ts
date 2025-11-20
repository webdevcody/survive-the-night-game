import { EntityType } from "../types/entity";
import Vector2 from "./vector2";

export interface SpatialGridEntity {
  getId(): number;
  getType(): EntityType;
}

export class SpatialGrid<T extends SpatialGridEntity> {
  private cells: Map<number, T>[][] = [];
  private cellSize: number;
  private rowLength: number;
  private colLength: number;
  private entityCellMap: WeakMap<T, [number, number]> = new WeakMap();
  private getPosition: (entity: T) => Vector2 | null;

  constructor(
    mapWidth: number,
    mapHeight: number,
    cellSize: number = 16,
    getPosition: (entity: T) => Vector2 | null
  ) {
    this.cellSize = cellSize;
    this.getPosition = getPosition;
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
    // WeakMap will be garbage collected automatically, but we can't clear it explicitly
    // The entityCellMap will naturally clear as entities are removed
  }

  addEntity(entity: T) {
    const pos = this.getPosition(entity);
    if (!pos) return;

    const cellX = (pos.x / this.cellSize) | 0; // Bitwise OR with 0 is faster than Math.floor
    const cellY = (pos.y / this.cellSize) | 0;

    if (this.isValidCell(cellX, cellY)) {
      this.cells[cellY][cellX].set(entity.getId(), entity);
      this.entityCellMap.set(entity, [cellX, cellY]);
    }
  }

  removeEntity(entity: T) {
    const cellCoords = this.entityCellMap.get(entity);
    if (cellCoords) {
      const [cellX, cellY] = cellCoords;
      if (this.isValidCell(cellX, cellY)) {
        this.cells[cellY][cellX].delete(entity.getId());
      }
      this.entityCellMap.delete(entity);
    }
  }

  updateEntity(entity: T) {
    // Remove from old cell
    const oldCellCoords = this.entityCellMap.get(entity);
    if (oldCellCoords) {
      const [oldCellX, oldCellY] = oldCellCoords;
      if (this.isValidCell(oldCellX, oldCellY)) {
        this.cells[oldCellY][oldCellX].delete(entity.getId());
      }
    }

    // Add to new cell
    const pos = this.getPosition(entity);
    if (!pos) {
      // If entity has no position (e.g. extension removed), just remove from tracking
      this.entityCellMap.delete(entity);
      return;
    }

    const newCellX = (pos.x / this.cellSize) | 0;
    const newCellY = (pos.y / this.cellSize) | 0;

    if (this.isValidCell(newCellX, newCellY)) {
      this.cells[newCellY][newCellX].set(entity.getId(), entity);
      this.entityCellMap.set(entity, [newCellX, newCellY]);
    } else {
      // If new cell is invalid, remove from tracking
      this.entityCellMap.delete(entity);
    }
  }

  private getCellCoords(position: Vector2): [number, number] {
    return [(position.x / this.cellSize) | 0, (position.y / this.cellSize) | 0];
  }

  private isValidCell(x: number, y: number): boolean {
    return y >= 0 && y < this.rowLength && x >= 0 && x < this.colLength;
  }

  getNearbyEntities(
    position: Vector2,
    radius: number = this.cellSize,
    filterSet?: Set<EntityType>,
    excludeSet?: Set<EntityType>
  ): T[] {
    const [cellX, cellY] = this.getCellCoords(position);
    const cellRadius = Math.ceil(radius / this.cellSize);
    const nearby: T[] = [];

    for (let y = -cellRadius; y <= cellRadius; y++) {
      for (let x = -cellRadius; x <= cellRadius; x++) {
        const checkX = cellX + x;
        const checkY = cellY + y;

        if (this.isValidCell(checkX, checkY)) {
          const cell = this.cells[checkY][checkX];
          // Early exit for empty cells
          if (cell.size === 0) {
            continue;
          }

          // Process entities based on filters
          for (const entity of cell.values()) {
            const entityType = entity.getType();

            // Exclude check takes precedence
            if (excludeSet && excludeSet.has(entityType)) {
              continue;
            }

            // Include filter check (if filterSet is provided, only include matching types)
            if (filterSet && !filterSet.has(entityType)) {
              continue;
            }

            // Entity passed all filters
            nearby.push(entity);
          }
        }
      }
    }

    return nearby;
  }
}
