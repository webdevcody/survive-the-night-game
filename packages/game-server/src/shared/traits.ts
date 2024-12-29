import { Vector2 } from "./physics";

export interface PositionableTrait {
  getPosition: () => Vector2;
  setPosition: (position: Vector2) => void;
  getCenterPosition: () => Vector2;
}

export interface ServerOnly {
  isServerOnly: () => boolean;
}

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface CollidableTrait {
  getHitbox: () => Hitbox;
}

export const IntersectionMethodIdentifiers = {
  Collidable: "getHitbox",
} as const;

export type IntersectionMethodName =
  (typeof IntersectionMethodIdentifiers)[keyof typeof IntersectionMethodIdentifiers];
