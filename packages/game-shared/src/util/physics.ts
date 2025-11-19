import { getConfig } from "@/config";
import { Hitbox } from "./hitbox";
import Vector2 from "./vector2";
import PoolManager from "./pool-manager";
import { PATHFINDING_DEBUG } from "../debug";

export { Vector2 };

export function roundVector2(vector: Vector2): Vector2 {
  return PoolManager.getInstance().vector2.claim(Math.round(vector.x), Math.round(vector.y));
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function velocityTowards(a: Vector2, b: Vector2): Vector2 {
  const d = distance(a, b);
  const poolManager = PoolManager.getInstance();

  if (d === 0) {
    return poolManager.vector2.claim(0, 0);
  }

  return poolManager.vector2.claim((b.x - a.x) / d, (b.y - a.y) / d);
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start to this node
  h: number; // Estimated cost from this node to end
  f: number; // g + h
  parent: Node | null;
}

interface PathStep {
  x: number;
  y: number;
}

interface CacheEntry {
  path: PathStep[]; // Full path from start to end
}

// LRU Cache for pathfinding results
const MAX_CACHE_SIZE = 10000;
const pathCache = new Map<string, CacheEntry>();
let cacheHits = 0;
let cacheMisses = 0;
let lastLogTime = Date.now();
const LOG_INTERVAL = 5000; // 5 seconds

function logCacheStats(): void {
  if (!PATHFINDING_DEBUG) {
    return;
  }

  const now = Date.now();
  if (now - lastLogTime >= LOG_INTERVAL) {
    const total = cacheHits + cacheMisses;
    const hitRate = total > 0 ? ((cacheHits / total) * 100).toFixed(2) : "0.00";
    console.log(
      `[Pathfinding Cache] Hits: ${cacheHits}, Misses: ${cacheMisses}, Hit Rate: ${hitRate}%, Size: ${pathCache.size}`
    );
    lastLogTime = now;
  }
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

  // Check cache first
  const cacheKey = `${startX},${startY}|${endX},${endY}`;
  const cachedEntry = pathCache.get(cacheKey);

  if (cachedEntry) {
    // Cache hit - move to end (most recently used) for LRU
    pathCache.delete(cacheKey);
    pathCache.set(cacheKey, cachedEntry);
    cacheHits++;
    logCacheStats();

    // Return the first step from the cached path (skip start position at index 0)
    if (cachedEntry.path.length === 0) {
      return null;
    }

    if (cachedEntry.path.length < 2) {
      // Path is just start->end (adjacent tiles)
      const lastStep = cachedEntry.path[cachedEntry.path.length - 1];
      const poolManager = PoolManager.getInstance();
      return poolManager.vector2.claim(
        lastStep.x * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2,
        lastStep.y * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2
      );
    }

    const firstStep = cachedEntry.path[1]; // First step to move to (skip start at index 0)
    const poolManager = PoolManager.getInstance();
    return poolManager.vector2.claim(
      firstStep.x * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2,
      firstStep.y * getConfig().world.TILE_SIZE + getConfig().world.TILE_SIZE / 2
    );
  }

  // Cache miss - proceed with pathfinding
  cacheMisses++;

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
      // Reconstruct the full path by traversing up the parent chain
      const fullPath: PathStep[] = [];
      let pathNode: Node | null = current;

      while (pathNode) {
        fullPath.unshift({ x: pathNode.x, y: pathNode.y });
        pathNode = pathNode.parent;
      }

      // Cache the entire path
      if (pathCache.size >= MAX_CACHE_SIZE) {
        // Evict least recently used entry (first in Map)
        const firstKey = pathCache.keys().next().value;
        if (firstKey) {
          pathCache.delete(firstKey);
        }
      }

      const cacheEntry: CacheEntry = {
        path: fullPath,
      };
      pathCache.set(cacheKey, cacheEntry);
      logCacheStats();

      // Return the first step (skip the start position, which is at index 0)
      // The first step to move to is at index 1
      if (fullPath.length < 2) {
        // Path is just start->end (adjacent tiles)
        const poolManager = PoolManager.getInstance();
        return poolManager.vector2.claim(
          fullPath[fullPath.length - 1].x * getConfig().world.TILE_SIZE +
            getConfig().world.TILE_SIZE / 2,
          fullPath[fullPath.length - 1].y * getConfig().world.TILE_SIZE +
            getConfig().world.TILE_SIZE / 2
        );
      }

      const firstStep = fullPath[1];
      const poolManager = PoolManager.getInstance();
      return poolManager.vector2.claim(
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

  // No path found
  logCacheStats();
  return null;
}

export function normalizeVector(vector: Vector2): Vector2 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  const poolManager = PoolManager.getInstance();
  if (magnitude === 0) return poolManager.vector2.claim(0, 0);
  return poolManager.vector2.claim(vector.x / magnitude, vector.y / magnitude);
}

export function isColliding(a: Hitbox, b: Hitbox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
