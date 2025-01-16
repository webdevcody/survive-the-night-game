import { DEBUG_SHOW_HITBOXES, DEBUG_SHOW_POSITIONS } from "@shared/debug";
import { Hitbox } from "../../../game-shared/src/util/hitbox";
import { Vector2 } from "../../../game-shared/src/util/physics";

export function debugDrawHitbox(
  ctx: CanvasRenderingContext2D,
  hitbox: Hitbox,
  color: string = "yellow"
) {
  if (!DEBUG_SHOW_HITBOXES) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
}

export function drawCenterPositionWithLabel(
  ctx: CanvasRenderingContext2D,
  position: Vector2,
  color: string = "blue"
) {
  if (!DEBUG_SHOW_POSITIONS) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.font = "5px Arial";
  ctx.strokeRect(position.x, position.y, 1, 1);
  ctx.fillText(
    `(${Math.floor(position.x)}, ${Math.floor(position.y)})`,
    position.x + 8,
    position.y - 8
  );
}
