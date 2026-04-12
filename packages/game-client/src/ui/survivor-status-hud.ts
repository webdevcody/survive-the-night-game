import { GameState } from "@/state";
import { Z_INDEX } from "@shared/map";
import { HeartsPanel } from "./panels/hearts-panel";
import { StaminaPanel } from "./panels/stamina-panel";
import type { MinimapHudLayout } from "./minimap-hud-group-layout";
import { RPG_BORDER_GOLD, RPG_HUD_PANEL_BG } from "./rpg-hud-theme";

/**
 * Health + stamina (sprint) orbs for survivors, flanking the bottom weapon strip.
 */
export class SurvivorStatusHud {
  private heartsPanel: HeartsPanel;
  private staminaPanel: StaminaPanel;

  constructor() {
    this.heartsPanel = new HeartsPanel({
      padding: 8,
      background: RPG_HUD_PANEL_BG,
      borderColor: RPG_BORDER_GOLD,
      borderWidth: 2,
      fontPx: 14,
    });

    this.staminaPanel = new StaminaPanel({
      padding: 8,
      background: RPG_HUD_PANEL_BG,
      borderColor: RPG_BORDER_GOLD,
      borderWidth: 2,
      fontPx: 14,
      barColor: "rgba(178, 152, 78, 0.92)",
    });
  }

  public renderHealthAndStamina(
    ctx: CanvasRenderingContext2D,
    gameState: GameState,
    layout: MinimapHudLayout
  ): void {
    this.heartsPanel.render(ctx, gameState, layout);
    this.staminaPanel.render(ctx, gameState, layout);
  }

  getZIndex() {
    return Z_INDEX.UI;
  }
}
