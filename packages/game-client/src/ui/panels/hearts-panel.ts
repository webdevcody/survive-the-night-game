import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { getConfig } from "@shared/config";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";
import { ClientPoison } from "@/extensions/poison";

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
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = this.heartSettings.inventorySettings;
    const slotsNumber = getConfig().player.HOTBAR_SLOTS;

    this.resetTransform(ctx);

    // Check if inventory is displayed (not a zombie player)
    const isZombiePlayer = player.isZombiePlayer?.() ?? false;
    const inventoryDisplayed = !isZombiePlayer;

    // Scale heart panel dimensions
    const scaledHeartSize = this.heartSettings.heartSize * hudScale;
    const scaledHeartGap = this.heartSettings.heartGap * hudScale;
    const scaledMarginBottom = this.heartSettings.marginBottom * hudScale;
    const scaledPanelPadding = this.settings.padding * hudScale;

    let heartsX: number;
    let heartsY: number;

    if (inventoryDisplayed) {
      // Calculate inventory bar position using scaled values (same as inventory-bar.ts)
      const scaledSlotSize = settings.slotSize * hudScale;
      const scaledSlotsGap = settings.slotsGap * hudScale;
      const scaledPadding = {
        left: settings.padding.left * hudScale,
        right: settings.padding.right * hudScale,
        top: settings.padding.top * hudScale,
        bottom: settings.padding.bottom * hudScale,
      };
      const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;

      const hotbarWidth =
        slotsNumber * scaledSlotSize +
        (slotsNumber - 1) * scaledSlotsGap +
        scaledPadding.left +
        scaledPadding.right;
      const hotbarHeight = scaledSlotSize + scaledPadding.top + scaledPadding.bottom;
      const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
      const hotbarY = canvasHeight - hotbarHeight - scaledScreenMarginBottom;

      // Position hearts above the inventory bar, aligned to the left
      heartsX = hotbarX + scaledPadding.left;
      heartsY = hotbarY - scaledHeartSize - scaledMarginBottom;
    } else {
      // Position hearts at bottom left of center (zombie mode - side by side with stamina)
      const scaledScreenMarginBottom = settings.screenMarginBottom * hudScale;
      const heartsContainerWidth = getConfig().player.MAX_PLAYER_HEALTH * scaledHeartSize +
        (getConfig().player.MAX_PLAYER_HEALTH - 1) * scaledHeartGap;
      // Position to the left of center with a small gap
      const gap = 8 * hudScale;
      heartsX = canvasWidth / 2 - heartsContainerWidth - scaledPanelPadding * 2 - gap;
      // Align bottom edge with stamina panel (panel is drawn at heartsY - scaledPanelPadding)
      heartsY = canvasHeight - scaledScreenMarginBottom - scaledHeartSize - scaledPanelPadding;
    }

    const currentHealth = player.getHealth();
    const maxHealth = getConfig().player.MAX_PLAYER_HEALTH;

    // Calculate background dimensions using scaled values
    const heartsContainerWidth =
      maxHealth * scaledHeartSize + (maxHealth - 1) * scaledHeartGap;

    // Draw background with border using scaled padding
    this.drawPanelBackground(
      ctx,
      heartsX - scaledPanelPadding,
      heartsY - scaledPanelPadding,
      heartsContainerWidth + scaledPanelPadding * 2,
      scaledHeartSize + scaledPanelPadding * 2
    );

    // Scale font size
    const baseFontSize = parseInt(this.heartSettings.font);
    const scaledFontSize = baseFontSize * hudScale;
    ctx.font = `${scaledFontSize}px Arial`;
    ctx.textBaseline = "top";

    // Check if player is poisoned
    const isPoisoned = player.hasExt(ClientPoison);

    // Render hearts
    for (let i = 0; i < maxHealth; i++) {
      const x = heartsX + i * (scaledHeartSize + scaledHeartGap);
      const isFilled = i < currentHealth;

      // Use green heart when poisoned, red heart when normal, empty heart for missing health
      const heartIcon = isFilled 
        ? (isPoisoned ? "💚" : "❤️")
        : "🖤";
      ctx.fillText(heartIcon, x, heartsY);
    }

    this.restoreContext(ctx);
  }
}
