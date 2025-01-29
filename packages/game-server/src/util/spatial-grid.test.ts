import { it, expect, describe } from "vitest";
import { SpatialGrid } from "./spatial-grid";
import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import Vector2 from "@/util/vector2";
import Positionable from "@/extensions/positionable";

class TestEntity extends Entity {
  constructor(gameManagers: IGameManagers, position: Vector2) {
    super(gameManagers, Entities.PLAYER);
    const positionable = new Positionable(this);
    positionable.setPosition(position);
    this.addExtension(positionable);
  }
}

describe("SpatialGrid", () => {
  const mockGameManagers = {
    getEntityManager: () => ({
      generateEntityId: () => "test-id",
    }),
  } as unknown as IGameManagers;

  it.skip("should add 10,000 entities in a square map of 100 tiles efficiently", () => {
    const mapSize = 100;
    const tileSize = 16;
    const spatialGrid = new SpatialGrid(mapSize * tileSize, mapSize * tileSize);
    const entities = [];

    for (let y = 0; y < mapSize * tileSize; y += tileSize) {
      for (let x = 0; x < mapSize * tileSize; x += tileSize) {
        entities.push(new TestEntity(mockGameManagers, new Vector2(x, y)));
      }
    }

    const iterations = 1000;
    let totalDuration = 0;

    for (let i = 0; i < iterations; i++) {
      spatialGrid.clear();
      const startTime = performance.now();
      entities.forEach((entity) => spatialGrid.addEntity(entity));
      const endTime = performance.now();
      totalDuration += endTime - startTime;
    }

    const averageDuration = totalDuration / iterations;
    expect(averageDuration).toBeLessThan(1);
  });

  it("should clear a grid with 10,000 entities efficiently", () => {
    const mapSize = 100;
    const tileSize = 16;
    const spatialGrid = new SpatialGrid(mapSize * tileSize, mapSize * tileSize);
    const entities = [];

    for (let y = 0; y < mapSize * tileSize; y += tileSize) {
      for (let x = 0; x < mapSize * tileSize; x += tileSize) {
        entities.push(new TestEntity(mockGameManagers, new Vector2(x, y)));
      }
    }

    // Add all entities once before starting test
    entities.forEach((entity) => spatialGrid.addEntity(entity));

    const iterations = 1000;
    let totalDuration = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      spatialGrid.clear();
      const endTime = performance.now();
      totalDuration += endTime - startTime;
      // Re-add entities for next iteration
      entities.forEach((entity) => spatialGrid.addEntity(entity));
    }

    const averageDuration = totalDuration / iterations;
    expect(averageDuration).toBeLessThan(1);
  });
});
