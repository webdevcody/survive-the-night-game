import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { scaleHudValue, calculateHudScale } from "@/util/hud-scale";
import { getExperienceProgress } from "@shared/util/experience-level";

const MUTE_BASE_LEFT = 20;
const MUTE_BASE_BOTTOM = 20;
const MUTE_BASE_HEIGHT = 40;
const GAP_ABOVE_MUTE = 8;

export interface ExperiencePanelSettings extends PanelSettings {
  baseBarWidth: number;
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

    const muteH = scaleHudValue(MUTE_BASE_HEIGHT, canvasWidth, canvasHeight);
    const muteBottom = scaleHudValue(MUTE_BASE_BOTTOM, canvasWidth, canvasHeight);
    const gap = scaleHudValue(GAP_ABOVE_MUTE, canvasWidth, canvasHeight);
    const left = scaleHudValue(MUTE_BASE_LEFT, canvasWidth, canvasHeight);

    const barW = scaleHudValue(this.barSettings.baseBarWidth, canvasWidth, canvasHeight);
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

    // Stack: label above bar; bar bottom sits `gap` above mute button top
    const barBottomFromTop = canvasHeight - muteBottom - muteH - gap;
    const barTop = barBottomFromTop - barH;
    const labelBaseline = barTop - Math.round(6 * hudScale);

    ctx.font = `bold ${labelFont}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = Math.max(2, Math.round(3 * hudScale));
    const xpHint =
      progress.xpToNextLevel > 0
        ? `Lv ${progress.level}  ${progress.currentXpInLevel}/${progress.xpToNextLevel} XP`
        : `Lv ${progress.level}  MAX`;
    ctx.strokeText(xpHint, left, labelBaseline);
    ctx.fillText(xpHint, left, labelBaseline);

    const barX = left;
    const barY = barTop;

    ctx.fillStyle = "rgba(20, 20, 30, 0.92)";
    ctx.strokeStyle = "rgba(180, 160, 90, 0.85)";
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
