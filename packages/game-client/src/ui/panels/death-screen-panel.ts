import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";
import { getPlayer } from "@/util/get-player";
import {
  RPG_BORDER_GOLD,
  RPG_METADATA_MUTED,
  RPG_PANEL_GRADIENT_BOTTOM,
  RPG_PANEL_GRADIENT_TOP,
  RPG_SLOT_STROKE,
} from "@/ui/rpg-hud-theme";

export interface DeathScreenPanelSettings extends PanelSettings {
  font: string;
  textColor: string;
  overlayBackground: string;
  panelBackground: string;
  text: string;
}

export class DeathScreenPanel extends Panel {
  private deathSettings: DeathScreenPanelSettings;
  private animationStart: number = 0;

  constructor(settings: DeathScreenPanelSettings) {
    super(settings);
    this.deathSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const player = getPlayer(gameState);
    if (!player || !player.isDead()) {
      this.animationStart = 0;
      return;
    }

    // Track animation start time
    if (this.animationStart === 0) {
      this.animationStart = Date.now();
    }

    this.resetTransform(ctx);

    // Calculate respawn cooldown remaining
    const cooldownRemaining = player.getRespawnCooldownRemaining();
    const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
    const maxCooldown = 5000; // 5 seconds max cooldown
    const progress = Math.max(0, Math.min(1, 1 - cooldownRemaining / maxCooldown));

    const { width, height } = ctx.canvas;

    // Draw dark overlay with vignette effect
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, width, height);

    // Add red vignette around edges
    const vignetteGradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.3,
      width / 2,
      height / 2,
      height * 0.8
    );
    vignetteGradient.addColorStop(0, "rgba(80, 0, 0, 0)");
    vignetteGradient.addColorStop(1, "rgba(80, 0, 0, 0.5)");
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, width, height);

    // Panel dimensions
    const panelWidth = 340;
    const panelHeight = 160;
    const x = (width - panelWidth) / 2;
    const y = (height - panelHeight) / 2;
    const borderRadius = 12;

    // Draw panel shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 4;

    // Draw panel background with rounded corners (RPG navy gradient)
    const panelGrad = ctx.createLinearGradient(x, y, x, y + panelHeight);
    panelGrad.addColorStop(0, RPG_PANEL_GRADIENT_TOP);
    panelGrad.addColorStop(1, RPG_PANEL_GRADIENT_BOTTOM);
    ctx.fillStyle = panelGrad;
    this.roundRect(ctx, x, y, panelWidth, panelHeight, borderRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = RPG_BORDER_GOLD;
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, panelWidth, panelHeight, borderRadius);
    ctx.stroke();

    ctx.strokeStyle = RPG_SLOT_STROKE;
    ctx.lineWidth = 1;
    this.roundRect(ctx, x + 4, y + 4, panelWidth - 8, panelHeight - 8, borderRadius - 2);
    ctx.stroke();

    // Draw skull icon or "YOU DIED" title
    ctx.font = "bold 32px Georgia";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(200, 60, 60, 1)";
    ctx.fillText("YOU DIED", width / 2, y + 50);

    // Draw respawn text
    ctx.font = "18px Arial";
    ctx.fillStyle = RPG_METADATA_MUTED;
    let respawnText: string;
    if (cooldownRemaining > 0) {
      respawnText = `Respawning in ${cooldownSeconds} second${cooldownSeconds !== 1 ? "s" : ""}...`;
    } else {
      respawnText = "Respawning...";
    }
    ctx.fillText(respawnText, width / 2, y + 85);

    // Draw progress bar background
    const barWidth = panelWidth - 60;
    const barHeight = 8;
    const barX = x + 30;
    const barY = y + 110;

    ctx.fillStyle = RPG_PANEL_GRADIENT_BOTTOM;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    // Draw progress bar fill
    const fillWidth = barWidth * progress;
    if (fillWidth > 0) {
      const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
      barGradient.addColorStop(0, "rgba(180, 60, 60, 1)");
      barGradient.addColorStop(1, "rgba(220, 80, 80, 1)");
      ctx.fillStyle = barGradient;
      this.roundRect(ctx, barX, barY, fillWidth, barHeight, 4);
      ctx.fill();
    }

    // Draw progress bar border
    ctx.strokeStyle = RPG_BORDER_GOLD;
    ctx.lineWidth = 1;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.stroke();

    // Reset text alignment
    ctx.textAlign = "left";

    this.restoreContext(ctx);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}
