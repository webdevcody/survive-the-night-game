import { GameState } from "@/state";
import { Entities } from "@shared/constants";
import { ClientDestructible } from "@/extensions";
import { Panel, PanelSettings } from "./panel";

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

    const { width: canvasWidth } = ctx.canvas;

    this.resetTransform(ctx);

    // Calculate container width including icon
    const barWidth = this.carHealthSettings.width + this.settings.padding * 2;
    const containerWidth = this.carHealthSettings.iconSize + this.carHealthSettings.iconGap + barWidth;
    const containerHeight = Math.max(
      this.carHealthSettings.height + this.settings.padding * 2,
      this.carHealthSettings.iconSize + this.settings.padding * 2
    );

    // Position car health bar at top center
    const carHealthX = canvasWidth / 2 - containerWidth / 2;
    const carHealthY = this.carHealthSettings.y;

    // Draw background with border
    this.drawPanelBackground(ctx, carHealthX, carHealthY, containerWidth, containerHeight);

    // Draw car icon
    ctx.font = this.carHealthSettings.font;
    ctx.textBaseline = "middle";
    ctx.fillStyle = "white";
    const iconX = carHealthX + this.settings.padding;
    const iconY = carHealthY + containerHeight / 2;
    ctx.fillText("🚗", iconX, iconY);

    // Draw health bar background
    const barContainerX = carHealthX + this.carHealthSettings.iconSize + this.carHealthSettings.iconGap;
    const barX = barContainerX + this.settings.padding;
    const barY = carHealthY + this.settings.padding;
    ctx.fillStyle = this.carHealthSettings.barBackgroundColor;
    ctx.fillRect(barX, barY, this.carHealthSettings.width, this.carHealthSettings.height);

    // Draw health bar fill
    const destructible = car.getExt(ClientDestructible);
    const currentHealth = destructible.getHealth();
    const maxHealth = destructible.getMaxHealth();
    const healthPercent = currentHealth / maxHealth;
    const fillWidth = this.carHealthSettings.width * healthPercent;

    ctx.fillStyle = this.carHealthSettings.barColor;
    ctx.fillRect(barX, barY, fillWidth, this.carHealthSettings.height);

    this.restoreContext(ctx);
  }
}
