import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { scaleHudValue, calculateHudScale } from "@/util/hud-scale";
import { getExperienceProgress } from "@shared/util/experience-level";
import { getLoadoutStripScreenLayout } from "@/ui/loadout-strip";
import {
  RPG_BORDER_GOLD,
  RPG_PANEL_GRADIENT_BOTTOM,
  RPG_TITLE_CREAM,
} from "@/ui/rpg-hud-theme";

/** Space between XP bar bottom and hotbar top. */
const GAP_ABOVE_HOTBAR = 8;

export interface ExperiencePanelSettings extends PanelSettings {
  baseBarHeight: number;
  baseLabelFontPx: number;
  /** Authoritative total XP from the local Player entity (game state). */
  getTotalExperience: () => number;
}

export class ExperiencePanel extends Panel {
  private barSettings: ExperiencePanelSettings;

  constructor(settings: ExperiencePanelSettings) {
    super(settings);
    this.barSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    this.resetTransform(ctx);

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);

    const strip = getLoadoutStripScreenLayout(canvasWidth, canvasHeight);
    const gap = scaleHudValue(GAP_ABOVE_HOTBAR, canvasWidth, canvasHeight);

    const barW = strip.w;
    const barH = scaleHudValue(this.barSettings.baseBarHeight, canvasWidth, canvasHeight);
    const labelFont = Math.max(
      10,
      Math.round(this.barSettings.baseLabelFontPx * hudScale),
    );

    const totalXp = Math.max(0, Math.floor(this.barSettings.getTotalExperience()));
    const progress = getExperienceProgress(totalXp);
    const fill =
      progress.xpToNextLevel > 0
        ? Math.min(1, progress.currentXpInLevel / progress.xpToNextLevel)
        : 1;

    // Stack: label above bar; bar sits `gap` px above the hotbar (same width, centered with strip)
    const barBottom = strip.y - gap;
    const barTop = barBottom - barH;
    const labelBaseline = barTop - Math.round(6 * hudScale);
    const labelCenterX = strip.x + strip.w / 2;

    ctx.font = `bold ${labelFont}px Georgia`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const xpHint =
      progress.xpToNextLevel > 0
        ? `Lv ${progress.level}  ${progress.currentXpInLevel}/${progress.xpToNextLevel} XP`
        : `Lv ${progress.level}  MAX`;
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.shadowColor = "rgba(6, 8, 16, 0.9)";
    ctx.shadowBlur = Math.max(2, Math.round(4 * hudScale));
    ctx.fillText(xpHint, labelCenterX, labelBaseline);
    ctx.shadowBlur = 0;

    const barX = strip.x;
    const barY = barTop;

    ctx.fillStyle = RPG_PANEL_GRADIENT_BOTTOM;
    ctx.strokeStyle = RPG_BORDER_GOLD;
    ctx.lineWidth = Math.max(1, Math.round(2 * hudScale));
    ctx.fillRect(barX, barY, barW, barH);
    ctx.strokeRect(barX, barY, barW, barH);

    const innerPad = Math.max(1, Math.round(2 * hudScale));
    const innerW = Math.max(0, barW - innerPad * 2);
    const innerH = Math.max(0, barH - innerPad * 2);
    ctx.fillStyle = "rgba(90, 200, 120, 0.95)";
    ctx.fillRect(barX + innerPad, barY + innerPad, innerW * fill, innerH);

    this.restoreContext(ctx);
  }
}
