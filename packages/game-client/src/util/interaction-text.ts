import { resolveStackedLabelY } from "@/util/text-stack";
import { getConfig } from "@shared/config";
import { distance } from "../../../game-shared/src/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

export function renderInteractionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerPosition: Vector2,
  position: Vector2,
  playerPosition: Vector2,
  offset = PoolManager.getInstance().vector2.claim(0, 0),
  isClosest = false
): void {
  if (distance(playerPosition, centerPosition) >= getConfig().player.MAX_INTERACT_RADIUS) {
    return;
  }

  ctx.save();
  ctx.font = "6px Arial";
  ctx.fillStyle = isClosest ? "yellow" : "white";
  const textWidth = ctx.measureText(text).width;
  const baseY = position.y - 3 + offset.y;
  const centerX = centerPosition.x + offset.x;
  const y = resolveStackedLabelY(centerX, textWidth, baseY);
  const x = centerX - textWidth / 2;
  ctx.fillText(text, x, y);
  ctx.restore();
}
