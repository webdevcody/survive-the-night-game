import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";
import { ClientInfiniteRun } from "@/extensions/infinite-run";
import type { MinimapHudLayout } from "@/ui/minimap-hud-group-layout";
import { renderLiquidResourceOrb } from "@/util/liquid-resource-orb";
import { RPG_BORDER_GOLD, RPG_METADATA_MUTED, RPG_ORB_EMPTY } from "@/ui/rpg-hud-theme";

/** Stamina orb when sprint ability is not yet unlocked (read-only / disabled look). */
const STAMINA_ORB_DISABLED_FILL = "rgba(82, 86, 96, 0.78)";
const STAMINA_ORB_DISABLED_EMPTY = "rgba(36, 38, 46, 0.94)";
const STAMINA_ORB_DISABLED_BORDER = "rgba(100, 104, 118, 0.55)";

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

    const sprintUnlocked = player.getAbilitySprintRank() > 0;
    const currentStamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    const fraction = maxStamina > 0 ? currentStamina / maxStamina : 0;
    const hasInfiniteRun = sprintUnlocked && player.hasExt(ClientInfiniteRun);

    const fillColor = !sprintUnlocked
      ? STAMINA_ORB_DISABLED_FILL
      : hasInfiniteRun
        ? "rgba(100, 150, 255, 0.95)"
        : this.staminaSettings.barColor;
    const emptyColor = !sprintUnlocked ? STAMINA_ORB_DISABLED_EMPTY : RPG_ORB_EMPTY;
    const borderColor = !sprintUnlocked
      ? STAMINA_ORB_DISABLED_BORDER
      : hasInfiniteRun
        ? "rgba(150, 190, 255, 0.95)"
        : RPG_BORDER_GOLD;

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
      labelColor: sprintUnlocked ? undefined : RPG_METADATA_MUTED,
    });

    this.restoreContext(ctx);
  }
}
