import { getConfig } from "@/config";
import { Hitbox } from "./hitbox";
import Vector2 from "./vector2";

export { Vector2 };

export function roundVector2(vector: Vector2): Vector2 {
  return new Vector2(Math.round(vector.x), Math.round(vector.y));
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function velocityTowards(a: Vector2, b: Vector2): Vector2 {
  const d = distance(a, b);

  if (d === 0) {
    return new Vector2(0, 0);
  }

  return new Vector2((b.x - a.x) / d, (b.y - a.y) / d);
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  h: number; // Estimated cost from this node to end
  f: number; // g + h
  parent: Node | null;
}

export function pathTowards(
  a: Vector2,
  b: Vector2,
  groundLayer: number[][],
  collidablesLayer?: number[][]
): Vector2 | null {
  const startX = Math.floor(a.x / getConfig().world.TILE_SIZE);
  const startY = Math.floor(a.y / getConfig().world.TILE_SIZE);
  const endX = Math.floor(b.x / getConfig().world.TILE_SIZE);
  const endY = Math.floor(b.y / getConfig().world.TILE_SIZE);

  // Check if target position is out of bounds or blocked by collidable
  const isOutOfBounds =
    endX < 0 || endX >= groundLayer[0].length || endY < 0 || endY >= groundLayer.length;
  const hasCollidable = !isOutOfBounds && collidablesLayer && collidablesLayer[endY][endX] !== -1;

  if (isOutOfBounds || hasCollidable) {
    return null;
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  openSet.push({
    x: startX,
    y: startY,
    g: 0,
    h: Math.abs(endX - startX) + Math.abs(endY - startY),
    f: 0,
    parent: null,
  });

  while (openSet.length > 0) {
    let current = openSet[0];
    let currentIndex = 0;
    openSet.forEach((node, index) => {
      if (node.f < current.f) {
        current = node;
        currentIndex = index;
      }
    });

    if (current.x === endX && current.y === endY) {
      // Find the first step in the path by traversing up the parent chain
      let firstStep = current;
      while (firstStep.parent && firstStep.parent.parent) {
        firstStep = firstStep.parent;
      }

      // Return the center position of the next tile to move to
      return new Vector2(
        firstStep.x * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2,
        firstStep.y * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2
      );
    }

    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    const neighbors = [
      { dx: 0, dy: -1 }, // up
      { dx: 1, dy: 0 }, // right
      { dx: 0, dy: 1 }, // down
      { dx: -1, dy: 0 }, // left
      { dx: 1, dy: -1 }, // up-right
      { dx: 1, dy: 1 }, // down-right
      { dx: -1, dy: 1 }, // down-left
      { dx: -1, dy: -1 }, // up-left
    ];

    for (const { dx, dy } of neighbors) {
      const newX = current.x + dx;
      const newY = current.y + dy;

      // Skip if out of bounds
      if (
        newX < 0 ||
        newX >= groundLayer[0].length ||
        newY < 0 ||
        newY >= groundLayer.length ||
        closedSet.has(`${newX},${newY}`)
      ) {
        continue;
      }

      // Skip if has collidable
      const hasCollidableObstacle = collidablesLayer && collidablesLayer[newY][newX] !== -1;
      if (hasCollidableObstacle) {
        continue;
      }

      // For diagonal movement, check if we're cutting corners between obstacles
      if (Math.abs(dx) === 1 && Math.abs(dy) === 1) {
        // Check the two adjacent tiles to ensure we're not cutting through obstacles
        const adjacentX_hasCollidable =
          collidablesLayer && collidablesLayer[current.y][newX] !== -1;
        const adjacentY_hasCollidable =
          collidablesLayer && collidablesLayer[newY][current.x] !== -1;

        if (adjacentX_hasCollidable || adjacentY_hasCollidable) {
          continue;
        }
      }

      const g = current.g + (Math.abs(dx) + Math.abs(dy) === 2 ? 1.4 : 1); // Slightly higher cost for diagonal movement
      const h = Math.abs(endX - newX) + Math.abs(endY - newY);
      const f = g + h;

      const existingNode = openSet.find((node) => node.x === newX && node.y === newY);

      if (!existingNode || g < existingNode.g) {
        const node: Node = {
          x: newX,
          y: newY,
          g,
          h,
          f,
          parent: current,
        };

        if (!existingNode) {
          openSet.push(node);
        } else {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      }
    }
  }

  return null;
}

export function normalizeVector(vector: Vector2): Vector2 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) return new Vector2(0, 0);
  return new Vector2(vector.x / magnitude, vector.y / magnitude);
}

export function isColliding(a: Hitbox, b: Hitbox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
