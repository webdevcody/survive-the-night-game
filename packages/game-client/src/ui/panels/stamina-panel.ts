import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { MAX_INVENTORY_SLOTS } from "@shared/constants/constants";
import { Panel, PanelSettings } from "./panel";

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
    const settings = this.staminaSettings.inventorySettings;
    const slotsNumber = MAX_INVENTORY_SLOTS;

    this.resetTransform(ctx);

    // Calculate inventory bar position to align stamina bar above it
    const hotbarWidth =
      slotsNumber * settings.slotSize +
      (slotsNumber - 1) * settings.slotsGap +
      settings.padding.left +
      settings.padding.right;
    const hotbarHeight = settings.slotSize + settings.padding.top + settings.padding.bottom;
    const hotbarX = canvasWidth / 2 - hotbarWidth / 2;
    const hotbarY = canvasHeight - hotbarHeight - settings.screenMarginBottom;

    // Calculate container width including icon
    const barWidth = this.staminaSettings.width + this.settings.padding * 2;
    const containerWidth = this.staminaSettings.iconSize + this.staminaSettings.iconGap + barWidth;
    const containerHeight = Math.max(
      this.staminaSettings.height + this.settings.padding * 2,
      this.staminaSettings.iconSize + this.settings.padding * 2
    );

    // Position stamina bar above the inventory bar, aligned to the right
    const staminaX = hotbarX + hotbarWidth - containerWidth;
    const staminaY = hotbarY - containerHeight - this.staminaSettings.marginBottom;

    // Draw background with border
    this.drawPanelBackground(ctx, staminaX, staminaY, containerWidth, containerHeight);

    // Draw run icon
    ctx.font = this.staminaSettings.font;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    const iconX = staminaX + this.settings.padding;
    const iconY = staminaY + containerHeight / 2;
    ctx.fillText("🏃", iconX, iconY);

    // Draw stamina bar background
    const barContainerX = staminaX + this.staminaSettings.iconSize + this.staminaSettings.iconGap;
    const barX = barContainerX + this.settings.padding;
    const barY = staminaY + this.settings.padding;
    ctx.fillStyle = this.staminaSettings.barBackgroundColor;
    ctx.fillRect(barX, barY, this.staminaSettings.width, this.staminaSettings.height);

    // Draw stamina bar fill
    const currentStamina = player.getStamina();
    const maxStamina = player.getMaxStamina();
    const staminaPercent = currentStamina / maxStamina;
    const fillWidth = this.staminaSettings.width * staminaPercent;

    ctx.fillStyle = this.staminaSettings.barColor;
    ctx.fillRect(barX, barY, fillWidth, this.staminaSettings.height);

    this.restoreContext(ctx);
  }
}
