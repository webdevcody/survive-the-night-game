import { Vector2 } from "./physics";

export interface ServerOnly {
  isServerOnly: () => boolean;
}

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function getHitboxWithPadding(position: Vector2, amount: number = 4): Hitbox {
  return {
    x: position.x + amount,
    y: position.y + amount,
    width: 16 - amount * 2,
    height: 16 - amount * 2,
  };
}
