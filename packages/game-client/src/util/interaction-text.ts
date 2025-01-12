import { Player, Vector2, distance } from "@survive-the-night/game-server";

export function renderInteractionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerPosition: Vector2,
  position: Vector2,
  playerPosition: Vector2
): void {
  if (distance(playerPosition, centerPosition) < Player.MAX_INTERACT_RADIUS) {
    ctx.fillStyle = "white";
    ctx.font = "6px Arial";
    const textWidth = ctx.measureText(text).width;
    console.log("CALLED");
    ctx.fillText(text, centerPosition.x - textWidth / 2, position.y - 3);
  }
}
