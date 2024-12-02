import { GameState } from "../state";

export interface Renderable {
  render: (ctx: CanvasRenderingContext2D, gameState: GameState) => void;
}

export interface IClientEntity {}
