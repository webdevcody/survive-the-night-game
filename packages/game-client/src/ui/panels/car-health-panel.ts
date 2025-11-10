import { GameState } from "@/state";
import { Entities } from "@shared/constants";
import { ClientDestructible } from "@/extensions";
import { Panel, PanelSettings } from "./panel";
import { calculateHudScale, scaleHudValue } from "@/util/hud-scale";

interface CarHealthPanelSettings extends PanelSettings {
  width: number;
  height: number;
  iconSize: number;
  iconGap: number;
  font: string;
  barBackgroundColor: string;
  barColor: string;
  y: number;
}

export class CarHealthPanel extends Panel {
  private carHealthSettings: CarHealthPanelSettings;

  constructor(settings: CarHealthPanelSettings) {
    super(settings);
    this.carHealthSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // Find the car entity
    const car = gameState.entities.find((entity) => entity.getType() === Entities.CAR);
    if (!car || !car.hasExt(ClientDestructible)) return;

    const { width: canvasWidth, height: canvasHeight } = ctx.canvas;
    const hudScale = calculateHudScale(canvasWidth, canvasHeight);

    this.resetTransform(ctx);

    // Scale all dimensions by HUD scale
    const scaledWidth = this.carHealthSettings.width * hudScale;
    const scaledHeight = this.carHealthSettings.height * hudScale;
    const scaledIconSize = this.carHealthSettings.iconSize * hudScale;
    const scaledIconGap = this.carHealthSettings.iconGap * hudScale;
    const scaledPadding = this.settings.padding * hudScale;
    const scaledBorderWidth = this.settings.borderWidth * hudScale;

    // Calculate container width including icon
    const barWidth = scaledWidth + scaledPadding * 2;
    const containerWidth = scaledIconSize + scaledIconGap + barWidth;
    const containerHeight = Math.max(
      scaledHeight + scaledPadding * 2,
      scaledIconSize + scaledPadding * 2
    );

    // Position car health bar at top center
    const carHealthX = canvasWidth / 2 - containerWidth / 2;
    // Align to top with small margin (scaled)
    const topMargin = scaleHudValue(20, canvasWidth, canvasHeight);
    const carHealthY = topMargin;

    // Draw background with border (using scaled border width)
    ctx.fillStyle = this.settings.background;
    ctx.fillRect(carHealthX, carHealthY, containerWidth, containerHeight);
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = scaledBorderWidth;
    ctx.strokeRect(carHealthX, carHealthY, containerWidth, containerHeight);

    // Draw car icon with scaled font
    const baseFontSize = parseInt(this.carHealthSettings.font);
    const scaledFontSize = baseFontSize * hudScale;
    ctx.font = `${scaledFontSize}px Arial`;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    const iconX = carHealthX + scaledPadding;
    const iconY = carHealthY + containerHeight / 2;
    ctx.fillText("🚗", iconX, iconY);

    // Draw health bar background
    const barContainerX = carHealthX + scaledIconSize + scaledIconGap;
    const barX = barContainerX + scaledPadding;
    // Vertically center the health bar within the container
    const barY = carHealthY + (containerHeight - scaledHeight) / 2;
    ctx.fillStyle = this.carHealthSettings.barBackgroundColor;
    ctx.fillRect(barX, barY, scaledWidth, scaledHeight);

    // Draw health bar fill
    const destructible = car.getExt(ClientDestructible);
    const currentHealth = destructible.getHealth();
    const maxHealth = destructible.getMaxHealth();
    const healthPercent = currentHealth / maxHealth;
    const fillWidth = scaledWidth * healthPercent;

    ctx.fillStyle = this.carHealthSettings.barColor;
    ctx.fillRect(barX, barY, fillWidth, scaledHeight);

    this.restoreContext(ctx);
  }
}
