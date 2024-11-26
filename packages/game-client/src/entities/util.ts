import { GameState } from "../state";
import { EntityType } from "@survive-the-night/game-server";

export interface Renderable {
  render: (ctx: CanvasRenderingContext2D, gameState: GameState) => void;
}
