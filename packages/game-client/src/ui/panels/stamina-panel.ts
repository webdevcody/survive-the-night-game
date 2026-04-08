import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";
import { ClientInfiniteRun } from "@/extensions/infinite-run";
import type { MinimapHudLayout } from "@/ui/minimap-hud-group-layout";
import { renderLiquidResourceOrb } from "@/util/liquid-resource-orb";

interface StaminaPanelSettings extends PanelSettings {
  fontPx: number;
  barColor: string;
}

export class StaminaPanel extends Panel {
  private staminaSettings: StaminaPanelSettings;

  constructor(settings: StaminaPanelSettings) {
    super(settings);
    this.staminaSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState, layout: MinimapHudLayout | null): void {
    const player = getPlayer(gameState);
    if (!player || !layout) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);

    this.resetTransform(ctx);

    const currentStamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    const fraction = maxStamina > 0 ? currentStamina / maxStamina : 0;
    const hasInfiniteRun = player.hasExt(ClientInfiniteRun);

    const fillColor = hasInfiniteRun
      ? "rgba(100, 150, 255, 0.95)"
      : this.staminaSettings.barColor;
    const emptyColor = "rgba(30, 28, 12, 0.92)";
    const borderColor = hasInfiniteRun ? "rgba(150, 190, 255, 0.95)" : "rgba(220, 200, 80, 0.9)";

    const { cx, cy, r } = layout.staminaOrb;
    const scaledFont = Math.max(10, Math.round(this.staminaSettings.fontPx * hudScale));

    const curLabel = Number.isInteger(currentStamina) ? `${currentStamina}` : currentStamina.toFixed(0);
    const maxLabel = Number.isInteger(maxStamina) ? `${maxStamina}` : maxStamina.toFixed(0);

    renderLiquidResourceOrb(ctx, {
      cx,
      cy,
      r,
      fillFraction: fraction,
      fillColor,
      emptyColor,
      borderColor,
      borderWidth: Math.max(2, Math.round(3 * hudScale)),
      label: `${curLabel}/${maxLabel}`,
      font: `bold ${scaledFont}px Arial`,
    });

    this.restoreContext(ctx);
  }
}
