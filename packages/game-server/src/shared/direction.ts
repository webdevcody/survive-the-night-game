import { Vector2 } from "./physics";

export enum Direction {
  Down,
  DownLeft,
  DownRight,
  Left,
  Right,
  Up,
  UpLeft,
  UpRight,
}

export function determineDirection(vector: Vector2): Direction | null {
  if (vector.x < 0 && vector.y > 0) {
    return Direction.DownLeft;
  } else if (vector.x > 0 && vector.y > 0) {
    return Direction.DownRight;
  } else if (vector.x < 0 && vector.y < 0) {
    return Direction.UpLeft;
  } else if (vector.x > 0 && vector.y < 0) {
    return Direction.UpRight;
  }

  if (vector.y > 0) {
    return Direction.Down;
  } else if (vector.x < 0) {
    return Direction.Left;
  } else if (vector.x > 0) {
    return Direction.Right;
  } else if (vector.y < 0) {
    return Direction.Up;
  }

  return null;
}

export function isDirectionDown(direction: Direction): boolean {
  return [Direction.Down, Direction.DownLeft, Direction.DownRight].includes(direction);
}

export function isDirectionLeft(direction: Direction): boolean {
  return [Direction.Left, Direction.DownLeft, Direction.UpLeft].includes(direction);
}

export function isDirectionRight(direction: Direction): boolean {
  return [Direction.Right, Direction.DownRight, Direction.UpRight].includes(direction);
}

export function isDirectionUp(direction: Direction): boolean {
  return [Direction.Up, Direction.UpLeft, Direction.UpRight].includes(direction);
}

export function normalizeDirection(direction: Direction): Vector2 {
  const result = { x: 0, y: 0 };

  if (isDirectionLeft(direction)) {
    result.x -= 1;
  }

  if (isDirectionUp(direction)) {
    result.y -= 1;
  }

  if (isDirectionRight(direction)) {
    result.x += 1;
  }

  if (isDirectionDown(direction)) {
    result.y += 1;
  }

  return result;
}
