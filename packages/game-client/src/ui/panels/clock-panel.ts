import { GameState } from "@/state";
import { getConfig } from "@shared/config";
import { Panel, PanelSettings } from "./panel";

interface ClockPanelSettings extends PanelSettings {
  radius: number;
  font: string;
  dayNumberFont: string;
  iconFont: string;
  x: number;
  y: number;
  dayColor: string;
  nightColor: string;
  progressColor: string;
}

export class ClockPanel extends Panel {
  private clockSettings: ClockPanelSettings;

  constructor(settings: ClockPanelSettings) {
    super(settings);
    this.clockSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const { x, y, radius } = this.clockSettings;

    // Use wave phase timing instead of day/night cycle
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.phaseStartTime) / 1000;
    const phaseProgress = Math.min(elapsedTime / gameState.phaseDuration, 1.0);

    // Draw outer circle (border)
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.stroke();

    // Fill background
    ctx.fillStyle = this.settings.background;
    ctx.fill();

    // Draw full circle as night (since we're always in wave-based gameplay)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius - this.settings.borderWidth, 0, Math.PI * 2);
    ctx.fillStyle = this.clockSettings.nightColor;
    ctx.fill();
    ctx.restore();

    // Draw progress indicator (hand of the clock)
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = this.clockSettings.progressColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Calculate the angle for the progress indicator based on wave phase
    const progressAngle = -Math.PI / 2 + Math.PI * 2 * phaseProgress;

    const handLength = radius - this.settings.borderWidth - 5;
    const handX = x + Math.cos(progressAngle) * handLength;
    const handY = y + Math.sin(progressAngle) * handLength;

    ctx.moveTo(x, y);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Draw a circle at the end of the hand
    ctx.beginPath();
    ctx.arc(handX, handY, 6, 0, Math.PI * 2);
    ctx.fillStyle = this.clockSettings.progressColor;
    ctx.fill();
    ctx.restore();

    // Draw moon icon (since we're always in wave-based gameplay)
    ctx.save();
    ctx.font = this.clockSettings.iconFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const iconDistance = radius * 0.6; // 60% from center
    const moonAngle = Math.PI / 2; // Top of circle
    const moonX = x + Math.cos(moonAngle) * iconDistance;
    const moonY = y + Math.sin(moonAngle) * iconDistance;
    ctx.fillText("🌙", moonX, moonY);
    ctx.restore();

    // Draw wave number in the center with outline for better contrast
    ctx.save();
    ctx.font = this.clockSettings.dayNumberFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw stroke (outline) for better contrast
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeText(`Wave ${gameState.waveNumber}`, x, y);

    // Draw fill text
    ctx.fillStyle = "white";
    ctx.fillText(`Wave ${gameState.waveNumber}`, x, y);
    ctx.restore();

    this.restoreContext(ctx);
  }
}
