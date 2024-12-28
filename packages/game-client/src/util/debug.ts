import { Hitbox } from "@survive-the-night/game-server";
import { DEBUG_SHOW_HITBOXES } from "@survive-the-night/game-server/src/config";

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
