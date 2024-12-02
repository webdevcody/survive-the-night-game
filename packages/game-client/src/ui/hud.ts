import { GameState } from "../state";

export class Hud {
  constructor() {}

  update(gameState: GameState): void {}

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width } = ctx.canvas;

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    const dayText = `Day ${gameState.dayNumber}`;
    const cycleText = `${gameState.isDay ? "Day" : "Night"} | ${Math.floor(
      gameState.untilNextCycle
    )}s Left`;

    const dayTextWidth = ctx.measureText(dayText).width;
    const cycleTextWidth = ctx.measureText(cycleText).width;

    const margin = 50;
    const gap = 50;
    ctx.fillText(dayText, width - dayTextWidth - margin, margin);
    ctx.fillText(cycleText, width - cycleTextWidth - margin, margin + gap);
  }
}
