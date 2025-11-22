import { beginTextStackFrame, resolveStackedLabelY } from "@/util/text-stack";
import { getConfig } from "@shared/config";
import { distance } from "../../../game-shared/src/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";

const INTERACTION_TEXT_FONT = "6px Arial";
const INTERACTION_TEXT_COLOR = "white";
const INTERACTION_TEXT_HIGHLIGHT_COLOR = "yellow";
const INTERACTION_TEXT_BG_COLOR = "rgba(0, 0, 0, 0.6)";
const INTERACTION_TEXT_PADDING_X = 2;

type QueuedInteractionText = {
  text: string;
  baseY: number;
  centerX: number;
  textWidth: number;
  isClosest: boolean;
  color?: string;
};

const queuedInteractionTexts: QueuedInteractionText[] = [];

export function renderInteractionText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerPosition: Vector2,
  position: Vector2,
  playerPosition: Vector2,
  offset = PoolManager.getInstance().vector2.claim(0, 0),
  isClosest = false,
  color?: string
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
    color,
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
    .forEach(({ text, centerX, baseY, textWidth, isClosest, color }) => {
      const y = resolveStackedLabelY(centerX, textWidth, baseY, isClosest);
      const x = centerX - textWidth / 2;

      // Draw background
      ctx.fillStyle = INTERACTION_TEXT_BG_COLOR;
      ctx.fillRect(
        x - INTERACTION_TEXT_PADDING_X,
        y - 6, // 6px font, draw slightly above baseline
        textWidth + INTERACTION_TEXT_PADDING_X * 2,
        8 // 6px font + 2px padding
      );

      // Use custom color if provided, otherwise use default highlight/color logic
      if (color) {
        ctx.fillStyle = color;
      } else {
        ctx.fillStyle = isClosest ? INTERACTION_TEXT_HIGHLIGHT_COLOR : INTERACTION_TEXT_COLOR;
      }
      ctx.fillText(text, x, y);
    });
  ctx.restore();

  queuedInteractionTexts.length = 0;
}
