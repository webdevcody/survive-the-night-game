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
