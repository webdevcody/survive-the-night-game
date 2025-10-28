import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { MAX_PLAYER_HEALTH, MAX_INVENTORY_SLOTS } from "@shared/constants/constants";
import { Panel, PanelSettings } from "./panel";

interface HeartsPanelSettings extends PanelSettings {
  marginBottom: number;
  heartSize: number;
  heartGap: number;
  font: string;
  inventorySettings: {
    screenMarginBottom: number;
    padding: { left: number; right: number; top: number; bottom: number };
    slotsGap: number;
    slotSize: number;
  };
}

export class HeartsPanel extends Panel {
  private heartSettings: HeartsPanelSettings;

  constructor(settings: HeartsPanelSettings) {
    super(settings);
    this.heartSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const settings = this.heartSettings.inventorySettings;
    const slotsNumber = MAX_INVENTORY_SLOTS;

    this.resetTransform(ctx);

    // Calculate inventory bar position to align hearts above it
    const hotbarWidth =
      slotsNumber * settings.slotSize +
      (slotsNumber - 1) * settings.slotsGap +
      settings.padding.left +
      settings.padding.right;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;
    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    // Position hearts above the inventory bar, aligned to the left
    const heartsX = hotbarX + settings.padding.left;
    const heartsY = hotbarY - this.heartSettings.heartSize - this.heartSettings.marginBottom;

    const currentHealth = player.getHealth();
    const maxHealth = MAX_PLAYER_HEALTH;

    // Calculate background dimensions
    const heartsContainerWidth =
      maxHealth * this.heartSettings.heartSize + (maxHealth - 1) * this.heartSettings.heartGap;

    // Draw background with border
    this.drawPanelBackground(
      ctx,
      heartsX - this.settings.padding,
      heartsY - this.settings.padding,
      heartsContainerWidth + this.settings.padding * 2,
      this.heartSettings.heartSize + this.settings.padding * 2
    );

    ctx.font = this.heartSettings.font;
    ctx.textBaseline = "top";

    // Render hearts
    for (let i = 0; i < maxHealth; i++) {
      const x = heartsX + i * (this.heartSettings.heartSize + this.heartSettings.heartGap);
      const isFilled = i < currentHealth;

      // Use filled heart for current health, empty heart for missing health
      const heartIcon = isFilled ? "❤️" : "🖤";
      ctx.fillText(heartIcon, x, heartsY);
    }

    this.restoreContext(ctx);
  }
}
