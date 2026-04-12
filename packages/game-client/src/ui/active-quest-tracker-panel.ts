import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import { calculateHudScale, scaleHudValue } from "@/util/hud-scale";
import type { MinimapScreenRect } from "./minimap-hud-group-layout";
import { getQuestObjectiveLine } from "./quest-display";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

export class ActiveQuestTrackerPanel {
  public render(
    ctx: CanvasRenderingContext2D,
    quests: readonly WorldMapQuestDefinition[],
    progress: PlayerQuestStatePayload | null,
    minimapRect: MinimapScreenRect,
  ): void {
    const st = progress ?? { active: {}, completed: [] };
    const activeIds = Object.keys(st.active);
    if (activeIds.length === 0) {
      return;
    }

    const activeQuestId = activeIds[0]!;
    const def = quests.find((quest) => quest.id === activeQuestId);
    const title = def?.title?.trim() || activeQuestId;
    const objective = getQuestObjectiveLine(def, st, activeQuestId);
    const extraQuestCount = Math.max(0, activeIds.length - 1);

    const { width: canvasW, height: canvasH } = ctx.canvas;
    const hudScale = calculateHudScale(canvasW, canvasH);
    const panelGap = scaleHudValue(12, canvasW, canvasH);
    const panelPad = scaleHudValue(12, canvasW, canvasH);
    const headerFontPx = Math.max(11, Math.round(13 * hudScale));
    const titleFontPx = Math.max(13, Math.round(16 * hudScale));
    const bodyFontPx = Math.max(11, Math.round(13 * hudScale));
    const lineHeight = Math.max(14, Math.round(17 * hudScale));
    const panelWidth = Math.min(
      Math.max(minimapRect.size + scaleHudValue(44, canvasW, canvasH), 220),
      canvasW - scaleHudValue(24, canvasW, canvasH),
    );
    const x = Math.max(
      scaleHudValue(12, canvasW, canvasH),
      minimapRect.left + minimapRect.size - panelWidth,
    );
    const y = minimapRect.top + minimapRect.size + panelGap;
    const textWidth = panelWidth - panelPad * 2;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = "top";

    ctx.font = `${bodyFontPx}px Arial`;
    const wrappedObjective = wrapText(ctx, objective, textWidth);
    const panelHeight =
      panelPad * 2 +
      headerFontPx +
      scaleHudValue(8, canvasW, canvasH) +
      titleFontPx +
      scaleHudValue(6, canvasW, canvasH) +
      wrappedObjective.length * lineHeight +
      (extraQuestCount > 0 ? lineHeight : 0);

    const gradient = ctx.createLinearGradient(x, y, x, y + panelHeight);
    gradient.addColorStop(0, "rgba(17, 25, 40, 0.96)");
    gradient.addColorStop(1, "rgba(10, 15, 27, 0.92)");
    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(108, 205, 255, 0.75)";
    ctx.lineWidth = Math.max(1, Math.round(2 * hudScale));
    ctx.fillRect(x, y, panelWidth, panelHeight);
    ctx.strokeRect(x, y, panelWidth, panelHeight);

    ctx.fillStyle = "rgba(88, 194, 255, 0.95)";
    ctx.fillRect(x, y, panelWidth, Math.max(3, Math.round(4 * hudScale)));

    let textY = y + panelPad;
    ctx.font = `bold ${headerFontPx}px Arial`;
    ctx.fillStyle = "rgba(154, 222, 255, 0.96)";
    ctx.fillText("Active quest", x + panelPad, textY);

    textY += headerFontPx + scaleHudValue(8, canvasW, canvasH);
    ctx.font = `bold ${titleFontPx}px Arial`;
    ctx.fillStyle = "rgba(245, 249, 255, 0.98)";
    ctx.fillText(title, x + panelPad, textY);

    textY += titleFontPx + scaleHudValue(6, canvasW, canvasH);
    ctx.font = `${bodyFontPx}px Arial`;
    ctx.fillStyle = "rgba(201, 214, 234, 0.95)";
    for (const line of wrappedObjective) {
      ctx.fillText(line, x + panelPad, textY);
      textY += lineHeight;
    }

    if (extraQuestCount > 0) {
      ctx.fillStyle = "rgba(140, 156, 180, 0.9)";
      ctx.fillText(`+${extraQuestCount} more active`, x + panelPad, textY);
    }

    ctx.restore();
  }
}
