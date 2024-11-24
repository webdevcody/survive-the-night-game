import { Direction } from "./direction";

export type Vector2 = { x: number; y: number };

export function roundVector2(vector: Vector2): Vector2 {
  return { x: Math.round(vector.x), y: Math.round(vector.y) };
}

export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function normalizeVector(vector: Vector2): Vector2 {
  const magnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (magnitude === 0) return { x: 0, y: 0 };
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude,
  };
}

export function normalizeDirection(direction: Direction): Vector2 {
  switch (direction) {
    case Direction.Down: {
      return { x: 0, y: -1 };
    }
    case Direction.DownLeft: {
      return { x: -1, y: -1 };
    }
    case Direction.DownRight: {
      return { x: 1, y: -1 };
    }
    case Direction.Left: {
      return { x: -1, y: 0 };
    }
    case Direction.Right: {
      return { x: 1, y: 0 };
    }
    case Direction.Up: {
      return { x: 0, y: 1 };
    }
    case Direction.UpLeft: {
      return { x: -1, y: 1 };
    }
    case Direction.UpRight: {
      return { x: 1, y: 1 };
    }
  }
}
