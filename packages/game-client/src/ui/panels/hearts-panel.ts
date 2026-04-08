import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { getConfig } from "@shared/config";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";
import { ClientPoison } from "@/extensions/poison";
import type { MinimapHudLayout } from "@/ui/minimap-hud-group-layout";
import { renderLiquidResourceOrb } from "@/util/liquid-resource-orb";

interface HeartsPanelSettings extends PanelSettings {
  fontPx: number;
}

export class HeartsPanel extends Panel {
  private heartSettings: HeartsPanelSettings;

  constructor(settings: HeartsPanelSettings) {
    super(settings);
    this.heartSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState, layout: MinimapHudLayout | null): void {
    const player = getPlayer(gameState);
    if (!player || !layout) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);

    this.resetTransform(ctx);

    const currentHealth = player.getHealth();
    const maxHealth = getConfig().player.MAX_PLAYER_HEALTH;
    const fraction = maxHealth > 0 ? currentHealth / maxHealth : 0;
    const isPoisoned = player.hasExt(ClientPoison);

    const fillColor = isPoisoned ? "rgba(80, 200, 90, 0.95)" : "rgba(200, 50, 55, 0.95)";
    const emptyColor = "rgba(25, 10, 12, 0.92)";
    const borderColor = isPoisoned ? "rgba(120, 220, 130, 0.95)" : "rgba(180, 60, 65, 0.95)";

    const { cx, cy, r } = layout.healthOrb;
    const scaledFont = Math.max(10, Math.round(this.heartSettings.fontPx * hudScale));

    renderLiquidResourceOrb(ctx, {
      cx,
      cy,
      r,
      fillFraction: fraction,
      fillColor,
      emptyColor,
      borderColor,
      borderWidth: Math.max(2, Math.round(3 * hudScale)),
      label: `${currentHealth}/${maxHealth}`,
      font: `bold ${scaledFont}px Arial`,
    });

    this.restoreContext(ctx);
  }
}
