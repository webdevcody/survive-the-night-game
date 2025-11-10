import { GameState } from "@/state";
import Vector2 from "@shared/util/vector2";
import { getConfig } from "@shared/config";

export interface Renderable {
  render: (ctx: CanvasRenderingContext2D, gameState: GameState) => void;
  getZIndex: () => number;
}

export interface IClientEntity {
  getId: () => string;
}

export function getFrameIndex(
  startedAt: number,
  animation: {
    frames: number;
    duration: number;
  }
) {
  const { duration, frames } = animation;
  const elapsed = Date.now() - startedAt;
  const frameDuration = duration / frames;
  return Math.floor(elapsed / frameDuration) % frames;
}

export function drawHealthBar(
  ctx: CanvasRenderingContext2D,
  position: Vector2,
  health: number,
  maxHealth: number,
  customWidth?: number
) {
  // Check if health bars are enabled in config
  if (!getConfig().render.showHealthBars) {
    return;
  }

  const healthBarWidth = customWidth ?? 16;
  const healthBarHeight = 2;
  const healthBarY = position.y - healthBarHeight - 2;

  ctx.fillStyle = "#ff0000";
  ctx.fillRect(position.x, healthBarY, healthBarWidth, healthBarHeight);

  ctx.fillStyle = "#00ff00";
  const healthPercentage = health / maxHealth;
  ctx.fillRect(position.x, healthBarY, healthBarWidth * healthPercentage, healthBarHeight);
}
