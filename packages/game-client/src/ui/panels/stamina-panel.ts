import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { getConfig } from "@shared/config";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale } from "@/util/hud-scale";
import { ClientInfiniteRun } from "@/extensions/infinite-run";

interface StaminaPanelSettings extends PanelSettings {
  marginBottom: number;
  width: number;
  height: number;
  iconSize: number;
  iconGap: number;
  font: string;
  barBackgroundColor: string;
  barColor: string;
  inventorySettings: {
    screenMarginBottom: number;
    padding: { left: number; right: number; top: number; bottom: number };
    slotsGap: number;
    slotSize: number;
  };
}

export class StaminaPanel extends Panel {
  private staminaSettings: StaminaPanelSettings;

  constructor(settings: StaminaPanelSettings) {
    super(settings);
    this.staminaSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);
    const settings = this.staminaSettings.inventorySettings;
    const slotsNumber = getConfig().player.HOTBAR_SLOTS;

    this.resetTransform(ctx);

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

    // Scale stamina panel dimensions
    const scaledBarWidth = this.staminaSettings.width * hudScale;
    const scaledBarHeight = this.staminaSettings.height * hudScale;
    const scaledIconSize = this.staminaSettings.iconSize * hudScale;
    const scaledIconGap = this.staminaSettings.iconGap * hudScale;
    const scaledMarginBottom = this.staminaSettings.marginBottom * hudScale;
    const scaledPanelPadding = this.settings.padding * hudScale;

    // Calculate container width including icon
    const barWidth = scaledBarWidth + scaledPanelPadding * 2;
    const containerWidth = scaledIconSize + scaledIconGap + barWidth;
    const containerHeight = Math.max(
      scaledBarHeight + scaledPanelPadding * 2,
      scaledIconSize + scaledPanelPadding * 2
    );

    // Position stamina bar above the inventory bar, aligned to the right
    const staminaX = hotbarX + hotbarWidth - containerWidth;
    const staminaY = hotbarY - containerHeight - scaledMarginBottom;

    // Draw background with border
    this.drawPanelBackground(ctx, staminaX, staminaY, containerWidth, containerHeight);

    // Draw run icon with scaled font
    const baseFontSize = parseInt(this.staminaSettings.font);
    const scaledFontSize = baseFontSize * hudScale;
    ctx.font = `${scaledFontSize}px Arial`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    const iconX = staminaX + scaledPanelPadding;
    const iconY = staminaY + containerHeight / 2;
    ctx.fillText("🏃", iconX, iconY);

    // Draw stamina bar background
    const barContainerX = staminaX + scaledIconSize + scaledIconGap;
    const barX = barContainerX + scaledPanelPadding;
    const barY = staminaY + scaledPanelPadding;
    ctx.fillStyle = this.staminaSettings.barBackgroundColor;
    ctx.fillRect(barX, barY, scaledBarWidth, scaledBarHeight);

    // Draw stamina bar fill
    const currentStamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    const staminaPercent = currentStamina / maxStamina;
    const fillWidth = scaledBarWidth * staminaPercent;

    // Check if infinite run extension is active (blue bar)
    const hasInfiniteRun = player.hasExt(ClientInfiniteRun);

    // Use blue color if infinite run is active, otherwise use default color
    ctx.fillStyle = hasInfiniteRun ? "rgba(100, 150, 255, 0.9)" : this.staminaSettings.barColor;
    ctx.fillRect(barX, barY, fillWidth, scaledBarHeight);

    this.restoreContext(ctx);
  }
}
