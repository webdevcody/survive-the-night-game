import { TILE_SIZE } from "../managers/map-manager";
import { Hitbox } from "./traits";

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

type Node = {
  x: number;
  y: number;
  f: number;
  g: number;
  h: number;
  parent: Node | null;
};

export function pathTowards(a: Vector2, b: Vector2, map: number[][]): Vector2 {
  const startX = Math.floor((a.x + TILE_SIZE / 2) / TILE_SIZE);
  const startY = Math.floor((a.y + TILE_SIZE / 2) / TILE_SIZE);
  const endX = Math.floor((b.x + TILE_SIZE / 2) / TILE_SIZE);
  const endY = Math.floor((b.y + TILE_SIZE / 2) / TILE_SIZE);

  console.log("\n=== Zombie Pathfinding Debug ===");
  console.log(`Zombie world pos: (${a.x.toFixed(2)}, ${a.y.toFixed(2)})`);
  console.log(
    `Zombie center: (${(a.x + TILE_SIZE / 2).toFixed(2)}, ${(a.y + TILE_SIZE / 2).toFixed(2)})`
  );
  console.log(`Zombie grid pos: (${startX}, ${startY})`);
  console.log(`Target world pos: (${b.x.toFixed(2)}, ${b.y.toFixed(2)})`);
  console.log(
    `Target center: (${(b.x + TILE_SIZE / 2).toFixed(2)}, ${(b.y + TILE_SIZE / 2).toFixed(2)})`
  );
  console.log(`Target grid pos: (${endX}, ${endY})`);

  // Correct row-by-column access (map[y][x])
  const canMoveLeft = startX > 0 && map[startY][startX - 1] <= 1;
  const canMoveRight = startX < map[0].length - 1 && map[startY][startX + 1] <= 1;
  const canMoveUp = startY > 0 && map[startY - 1][startX] <= 1;
  const canMoveDown = startY < map.length - 1 && map[startY + 1][startX] <= 1;

  // Debug visualization with correct coordinates
  console.log("\nSurrounding area (Z=Zombie, P=Player, #=Wall):");
  for (let y = startY - 3; y <= startY + 3; y++) {
    let row = "";
    for (let x = startX - 3; x <= startX + 3; x++) {
      if (x === startX && y === startY) {
        row += "Z ";
      } else if (x === endX && y === endY) {
        row += "P ";
      } else if (y >= 0 && y < map.length && x >= 0 && x < map[0].length) {
        row += map[y][x] > 1 ? "# " : ". ";
      } else {
        row += "X ";
      }
    }
    console.log(row);
  }

  const dx = endX - startX;
  const dy = endY - startY;
  console.log(`\nDistance to target: dx=${dx}, dy=${dy}`);

  // Check available moves using grid coordinates
  console.log("Available moves:");
  console.log(`  Left: ${canMoveLeft} (tile: ${startX > 0 ? map[startY][startX - 1] : "OOB"})`);
  console.log(
    `  Right: ${canMoveRight} (tile: ${
      startX < map[0].length - 1 ? map[startY][startX + 1] : "OOB"
    })`
  );
  console.log(`  Up: ${canMoveUp} (tile: ${startY > 0 ? map[startY - 1][startX] : "OOB"})`);
  console.log(
    `  Down: ${canMoveDown} (tile: ${startY < map.length - 1 ? map[startY + 1][startX] : "OOB"})`
  );

  // Simple movement logic - try to move in the direction that's both available and reduces distance
  if (Math.abs(dx) > Math.abs(dy)) {
    // Prefer horizontal movement
    if (dx < 0 && canMoveLeft) {
      console.log("Decision: Moving left (primary direction)");
      return { x: -1, y: 0 };
    }
    if (dx > 0 && canMoveRight) {
      console.log("Decision: Moving right (primary direction)");
      return { x: 1, y: 0 };
    }
    // If horizontal blocked, try vertical
    if (dy < 0 && canMoveUp) {
      console.log("Decision: Moving up (secondary direction)");
      return { x: 0, y: -1 };
    }
    if (dy > 0 && canMoveDown) {
      console.log("Decision: Moving down (secondary direction)");
      return { x: 0, y: 1 };
    }
  } else {
    // Prefer vertical movement
    if (dy < 0 && canMoveUp) {
      console.log("Decision: Moving up (primary direction)");
      return { x: 0, y: -1 };
    }
    if (dy > 0 && canMoveDown) {
      console.log("Decision: Moving down (primary direction)");
      return { x: 0, y: 1 };
    }
    // If vertical blocked, try horizontal
    if (dx < 0 && canMoveLeft) {
      console.log("Decision: Moving left (secondary direction)");
      return { x: -1, y: 0 };
    }
    if (dx > 0 && canMoveRight) {
      console.log("Decision: Moving right (secondary direction)");
      return { x: 1, y: 0 };
    }
  }

  // If no direct path, try any available move
  if (canMoveLeft) return { x: -1, y: 0 };
  if (canMoveRight) return { x: 1, y: 0 };
  if (canMoveUp) return { x: 0, y: -1 };
  if (canMoveDown) return { x: 0, y: 1 };

  console.log("Decision: NO VALID MOVEMENT FOUND");
  return { x: 0, y: 0 };
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
