import { it, expect, describe } from "vitest";
import QuadTree from "./quad-tree";
import { Rectangle, Point, Circle } from "@shared/util/shape";
import Vector2 from "@shared/util/vector2";
import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";

class TestEntity extends Entity {
  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.PLAYER);
  }
}

describe("QuadTree", () => {
  const mockGameManagers = {
    getEntityManager: () => ({
      generateEntityId: () => "test-id",
    }),
  } as unknown as IGameManagers;

  it("should add entities to root node when under capacity", () => {
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary, 4);
    const entity = new TestEntity(mockGameManagers);
    const shape = new Rectangle(new Vector2(10, 10), new Vector2(10, 10));

    const added = quadTree.add(shape, entity);
    expect(added).toBe(true);

    const found = quadTree.query(shape);
    expect(found.size).toBe(1);
    expect(found.has(entity)).toBe(true);
  });

  it("should split and redistribute when capacity is exceeded", () => {
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary, 2);

    // Add entities to different quadrants
    const entity1 = new TestEntity(mockGameManagers);
    const shape1 = new Rectangle(new Vector2(10, 10), new Vector2(10, 10)); // Northwest

    const entity2 = new TestEntity(mockGameManagers);
    const shape2 = new Rectangle(new Vector2(80, 10), new Vector2(10, 10)); // Northeast

    const entity3 = new TestEntity(mockGameManagers);
    const shape3 = new Rectangle(new Vector2(10, 80), new Vector2(10, 10)); // Southwest

    quadTree.add(shape1, entity1);
    quadTree.add(shape2, entity2);
    quadTree.add(shape3, entity3);

    // Query each quadrant separately
    const northwestQuery = new Rectangle(new Vector2(0, 0), new Vector2(50, 50));
    const northeastQuery = new Rectangle(new Vector2(50, 0), new Vector2(50, 50));
    const southwestQuery = new Rectangle(new Vector2(0, 50), new Vector2(50, 50));

    const nwFound = quadTree.query(northwestQuery);
    const neFound = quadTree.query(northeastQuery);
    const swFound = quadTree.query(southwestQuery);

    expect(nwFound.size).toBe(1);
    expect(nwFound.has(entity1)).toBe(true);

    expect(neFound.size).toBe(1);
    expect(neFound.has(entity2)).toBe(true);

    expect(swFound.size).toBe(1);
    expect(swFound.has(entity3)).toBe(true);
  });

  it("should keep entities in parent node if they intersect multiple quadrants", () => {
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary, 2);

    // Add an entity that spans quadrants
    const entity1 = new TestEntity(mockGameManagers);
    const shape1 = new Rectangle(new Vector2(40, 40), new Vector2(20, 20)); // Spans center

    // Add entities in specific quadrants
    const entity2 = new TestEntity(mockGameManagers);
    const shape2 = new Rectangle(new Vector2(10, 10), new Vector2(10, 10)); // Northwest

    quadTree.add(shape1, entity1);
    quadTree.add(shape2, entity2);

    // Query the center area
    const centerQuery = new Rectangle(new Vector2(45, 45), new Vector2(10, 10));
    const found = quadTree.query(centerQuery);

    expect(found.size).toBe(1);
    expect(found.has(entity1)).toBe(true);
    expect(found.has(entity2)).toBe(false);
  });

  it("should handle different shape types correctly", () => {
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary, 4);

    const entity1 = new TestEntity(mockGameManagers);
    const point = new Point(new Vector2(25, 25));

    const entity2 = new TestEntity(mockGameManagers);
    const circle = new Circle(new Vector2(75, 75), 10);

    quadTree.add(point, entity1);
    quadTree.add(circle, entity2);

    // Query with a rectangle that covers both shapes
    const queryShape = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const found = quadTree.query(queryShape);

    expect(found.size).toBe(2);
    expect(found.has(entity1)).toBe(true);
    expect(found.has(entity2)).toBe(true);
  });

  it("should clear all nodes and reset state", () => {
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary, 2);

    // Add enough entities to cause subdivision
    const entity1 = new TestEntity(mockGameManagers);
    const shape1 = new Rectangle(new Vector2(10, 10), new Vector2(10, 10));

    const entity2 = new TestEntity(mockGameManagers);
    const shape2 = new Rectangle(new Vector2(80, 10), new Vector2(10, 10));

    const entity3 = new TestEntity(mockGameManagers);
    const shape3 = new Rectangle(new Vector2(10, 80), new Vector2(10, 10));

    quadTree.add(shape1, entity1);
    quadTree.add(shape2, entity2);
    quadTree.add(shape3, entity3);

    // Clear the tree
    quadTree.clear();

    // Query the entire space
    const queryShape = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const found = quadTree.query(queryShape);

    expect(found.size).toBe(0);
  });

  it.skip("should efficiently add many boundary entities in a grid pattern", () => {
    const mapSize = 100;
    const boundary = new Rectangle(new Vector2(0, 0), new Vector2(100, 100));
    const quadTree = new QuadTree(boundary);

    const startTime = performance.now();

    const tileSize = 16;

    for (let y = 0; y < mapSize * tileSize; y += tileSize) {
      for (let x = 0; x < mapSize * tileSize; x += tileSize) {
        const entity = new TestEntity(mockGameManagers);
        const boundaryShape = new Rectangle(new Vector2(x, y), new Vector2(tileSize, tileSize));
        quadTree.add(boundaryShape, entity);
      }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(duration).toBeLessThan(10);
  });
});
