import { Direction } from "./direction";
import { ItemType } from "./inventory";

export type Input = {
  facing: Direction;
  dx: number;
  dy: number;
  fire: boolean;
  sprint: boolean;
  aimAngle?: number; // Optional: angle in radians for directional shooting (mouse aiming)
  aimDistance?: number; // Optional: distance from player to crosshair in world units
};
