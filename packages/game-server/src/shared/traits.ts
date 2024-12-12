import { Vector2 } from "./physics";
import { Player } from "./entities/player";

export interface Harvestable {
  harvest(player: Player): void;
}

export interface Positionable {
  getPosition: () => Vector2;
  setPosition: (position: Vector2) => void;
  getCenterPosition: () => Vector2;
}

export interface ServerOnly {
  isServerOnly: () => boolean;
}

export interface Movable {
  getVelocity: () => Vector2;
  setVelocity: (velocity: Vector2) => void;
}

export interface Updatable {
  update: (deltaTime: number) => void;
}

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface Collidable {
  getHitbox: () => Hitbox;
}

export interface Damageable {
  damage: (damage: number) => void;
  getHealth: () => number;
  getDamageBox: () => Hitbox;
}

export const DamageableKey = "damage";

export const IntersectionMethodIdentifiers = {
  Collidable: "getHitbox",
  Damageable: "getDamageBox",
} as const;

export type IntersectionMethodName =
  (typeof IntersectionMethodIdentifiers)[keyof typeof IntersectionMethodIdentifiers];
