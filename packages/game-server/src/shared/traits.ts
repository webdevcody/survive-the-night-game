import { Vector2 } from "./physics";

export interface Harvestable {
  harvest(): void;
  getIsHarvested(): boolean;
}

export const HARVEST_DISTANCE = 10;

export interface Positionable {
  getPosition: () => Vector2;
  setPosition: (position: Vector2) => void;
  getCenterPosition: () => Vector2;
}

export interface Movable {
  getVelocity: () => Vector2;
  setVelocity: (velocity: Vector2) => void;
}

export interface Updatable {
  update: (deltaTime: number) => void;
}
