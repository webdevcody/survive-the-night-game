import { Vector2 } from "./physics";
import { Player } from "./entities/player";

export interface Interactable {
  interact(player: Player): void;
}

export const InteractableKey = "interact";

export interface PositionableTrait {
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

export interface CollidableTrait {
  getHitbox: () => Hitbox;
}

export interface Damageable {
  damage: (damage: number) => void;
  getHealth: () => number;
  getDamageBox: () => Hitbox;
  isDead: () => boolean;
  getMaxHealth: () => number;
  heal: (amount: number) => void;
}

export const DamageableKey = "damage";

export const IntersectionMethodIdentifiers = {
  Collidable: "getHitbox",
  Damageable: "getDamageBox",
} as const;

export type IntersectionMethodName =
  (typeof IntersectionMethodIdentifiers)[keyof typeof IntersectionMethodIdentifiers];
