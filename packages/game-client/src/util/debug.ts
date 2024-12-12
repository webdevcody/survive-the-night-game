import { DEBUG, Hitbox } from "@survive-the-night/game-server";

export function debugDrawHitbox(
  ctx: CanvasRenderingContext2D,
  hitbox: Hitbox,
  color: string = "yellow"
) {
  if (!DEBUG) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
}
