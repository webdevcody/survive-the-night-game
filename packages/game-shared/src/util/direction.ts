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

/**
 * Convert an angle in radians to the nearest cardinal direction (Up, Down, Left, Right)
 * @param angle Angle in radians (0 = right, PI/2 = down, PI = left, 3PI/2 = up)
 * @returns The nearest cardinal direction
 */
export function angleToDirection(angle: number): Direction {
  // Normalize angle to 0-2PI range
  let normalizedAngle = angle % (Math.PI * 2);
  if (normalizedAngle < 0) {
    normalizedAngle += Math.PI * 2;
  }

  // Convert to degrees for easier calculation
  const degrees = (normalizedAngle * 180) / Math.PI;

  // Determine direction based on angle ranges
  // Right: -45 to 45 degrees (315 to 45)
  // Down: 45 to 135 degrees
  // Left: 135 to 225 degrees
  // Up: 225 to 315 degrees

  if (degrees >= 315 || degrees < 45) {
    return Direction.Right;
  } else if (degrees >= 45 && degrees < 135) {
    return Direction.Down;
  } else if (degrees >= 135 && degrees < 225) {
    return Direction.Left;
  } else {
    return Direction.Up;
  }
}
