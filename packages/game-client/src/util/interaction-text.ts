import { beginTextStackFrame, resolveStackedLabelY } from "@/util/text-stack";
import { getConfig } from "@shared/config";
import { distance } from "../../../game-shared/src/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

const INTERACTION_TEXT_FONT = "6px Arial";
const INTERACTION_TEXT_COLOR = "white";
const INTERACTION_TEXT_HIGHLIGHT_COLOR = "yellow";

type QueuedInteractionText = {
  text: string;
  baseY: number;
  centerX: number;
  textWidth: number;
  isClosest: boolean;
};

const queuedInteractionTexts: QueuedInteractionText[] = [];

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
  ctx.font = INTERACTION_TEXT_FONT;
  const textWidth = ctx.measureText(text).width;
  ctx.restore();

  const baseY = position.y - 3 + offset.y;
  const centerX = centerPosition.x + offset.x;
  queuedInteractionTexts.push({
    text,
    baseY,
    centerX,
    textWidth,
    isClosest,
  });
}

export function beginInteractionTextFrame(): void {
  queuedInteractionTexts.length = 0;
  beginTextStackFrame();
}

export function flushInteractionText(ctx: CanvasRenderingContext2D): void {
  if (queuedInteractionTexts.length === 0) {
    return;
  }

  ctx.save();
  ctx.font = INTERACTION_TEXT_FONT;
  queuedInteractionTexts
    .sort((a, b) => {
      if (a.isClosest !== b.isClosest) {
        return a.isClosest ? -1 : 1;
      }
      if (a.baseY !== b.baseY) {
        return a.baseY - b.baseY;
      }
      return a.centerX - b.centerX;
    })
    .forEach(({ text, centerX, baseY, textWidth, isClosest }) => {
      const y = resolveStackedLabelY(centerX, textWidth, baseY, isClosest);
      const x = centerX - textWidth / 2;
      ctx.fillStyle = isClosest ? INTERACTION_TEXT_HIGHLIGHT_COLOR : INTERACTION_TEXT_COLOR;
      ctx.fillText(text, x, y);
    });
  ctx.restore();

  queuedInteractionTexts.length = 0;
}
