import Vector2 from "./vector2";

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
