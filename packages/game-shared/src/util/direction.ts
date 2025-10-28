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
  const absX = Math.abs(vector.x);
  const absY = Math.abs(vector.y);

  if (absX > absY) {
    return vector.x > 0 ? Direction.Right : Direction.Left;
  } else if (absY > absX) {
    return vector.y > 0 ? Direction.Down : Direction.Up;
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
  let x = 0;
  let y = 0;

  if (isDirectionLeft(direction)) {
    x -= 1;
  }

  if (isDirectionUp(direction)) {
    y -= 1;
  }

  if (isDirectionRight(direction)) {
    x += 1;
  }

  if (isDirectionDown(direction)) {
    y += 1;
  }

  return new Vector2(x, y);
}
