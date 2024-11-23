import { GameState } from "../state";
import { EntityType } from "@survive-the-night/game-server";

export interface Renderable {
  render: (ctx: CanvasRenderingContext2D, gameState: GameState) => void;
}

export interface IClientEntity {
  setType(type: EntityType): void;
  getType(): EntityType;
  getId(): string;
  setId(id: string): void;
}
