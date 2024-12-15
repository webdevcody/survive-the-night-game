import { TILE_SIZE } from "../managers/map-manager.js";
import { Hitbox } from "./traits.js";

export type Vector2 = { x: number; y: number };

export function roundVector2(vector: Vector2): Vector2 {
  return { x: Math.round(vector.x), y: Math.round(vector.y) };
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function velocityTowards(a: Vector2, b: Vector2): Vector2 {
  const d = distance(a, b);

  if (d === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (b.x - a.x) / d,
    y: (b.y - a.y) / d,
  };
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  h: number; // Estimated cost from this node to end
  f: number; // g + h
  parent: Node | null;
}

export function pathTowards(a: Vector2, b: Vector2, map: number[][]): Vector2 | null {
  const startX = Math.floor(a.x / TILE_SIZE);
  const startY = Math.floor(a.y / TILE_SIZE);
  const endX = Math.floor(b.x / TILE_SIZE);
  const endY = Math.floor(b.y / TILE_SIZE);

  if (
    endX < 0 ||
    endX >= map[0].length ||
    endY < 0 ||
    endY >= map.length ||
    map[endY][endX] === 2 // Forest tile ID
  ) {
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
      return {
        x: firstStep.x * TILE_SIZE + TILE_SIZE / 2,
        y: firstStep.y * TILE_SIZE + TILE_SIZE / 2,
      };
    }

    openSet.splice(currentIndex, 1);
    closedSet.add(`${current.x},${current.y}`);

    const neighbors = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    for (const { dx, dy } of neighbors) {
      const newX = current.x + dx;
      const newY = current.y + dy;

      if (
        newX < 0 ||
        newX >= map[0].length ||
        newY < 0 ||
        newY >= map.length ||
        map[newY][newX] >= 2 // Forest tile ID
      ) {
        continue;
      }

      if (closedSet.has(`${newX},${newY}`)) {
        continue;
      }

      const g = current.g + 1;
      const h = Math.abs(endX - newX) + Math.abs(endY - newY);
      const f = g + h;

      const existingNode = openSet.find((node) => node.x === newX && node.y === newY);
      if (existingNode && g >= existingNode.g) {
        continue;
      }

      if (!existingNode) {
        openSet.push({
          x: newX,
          y: newY,
          g,
          h,
          f,
          parent: current,
        });
      } else {
        existingNode.g = g;
        existingNode.f = f;
        existingNode.parent = current;
      }
    }
  }

  return null;
}

export function normalizeVector(vector: Vector2): Vector2 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) return { x: 0, y: 0 };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

export function isColliding(a: Hitbox, b: Hitbox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
