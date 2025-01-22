import { MAX_INTERACT_RADIUS } from "@shared/constants/constants";
import { distance } from "../../../game-shared/src/util/physics";
import Vector2 from "@shared/util/vector2";

export function renderInteractionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerPosition: Vector2,
  position: Vector2,
  playerPosition: Vector2,
  offset = new Vector2(0, 0)
): void {
  if (distance(playerPosition, centerPosition) < MAX_INTERACT_RADIUS) {
    ctx.fillStyle = "white";
    ctx.font = "6px Arial";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, centerPosition.x - textWidth / 2 + offset.x, position.y - 3 + offset.y);
  }
}
