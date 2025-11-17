import { BossMetadata } from "@shared/entities";
import Vector2 from "@shared/util/vector2";
import { resolveStackedLabelY } from "@/util/text-stack";

export interface BossPresentationOptions {
  ctx: CanvasRenderingContext2D;
  metadata: BossMetadata;
  renderPosition: Vector2;
  entitySize: Vector2;
  health: number;
  maxHealth: number;
}

export function renderBossPresentation({
  ctx,
  metadata,
  renderPosition,
  entitySize,
  health,
  maxHealth,
}: BossPresentationOptions): void {
  const centerX = renderPosition.x + entitySize.x / 2;
  const healthBarConfig = metadata.healthBar ?? {
    width: entitySize.x,
    height: 3,
    offsetY: 6,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    fillColor: "#ff4d4f",
    borderColor: "#300000",
  };

  const barWidth = healthBarConfig.width;
  const barHeight = healthBarConfig.height ?? 3;
  const offsetY = healthBarConfig.offsetY ?? 6;
  const barX = centerX - barWidth / 2;
  const barY = renderPosition.y - offsetY - barHeight;

  // Draw boss name (if specified) directly above the bar
  if (metadata.name) {
    ctx.save();
    ctx.font = metadata.nameFont ?? "6px Arial";
    ctx.fillStyle = metadata.nameColor ?? "#ff3b30";
    ctx.textAlign = "center";
    const textWidth = ctx.measureText(metadata.name).width;
    const baseNameY = barY - 2 + (metadata.nameOffsetY ?? 0);
    const nameY = resolveStackedLabelY(centerX, textWidth, baseNameY);
    ctx.fillText(metadata.name, centerX, nameY);
    ctx.restore();
  }

  ctx.save();
  ctx.fillStyle = healthBarConfig.backgroundColor ?? "rgba(0, 0, 0, 0.8)";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const percentage = Math.max(0, Math.min(1, health / maxHealth));
  ctx.fillStyle = healthBarConfig.fillColor ?? "#ff4d4f";
  ctx.fillRect(barX, barY, barWidth * percentage, barHeight);

  if (healthBarConfig.borderColor) {
    ctx.strokeStyle = healthBarConfig.borderColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
  ctx.restore();
}
