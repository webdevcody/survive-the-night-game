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
    const totalCycleDuration = getConfig().dayNight.DAY_DURATION + getConfig().dayNight.NIGHT_DURATION;

    // Calculate day and night as portions of the full cycle
    const dayPortion = getConfig().dayNight.DAY_DURATION / totalCycleDuration;
    const nightPortion = getConfig().dayNight.NIGHT_DURATION / totalCycleDuration;

    // Calculate current progress within the cycle
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const cycleProgress = elapsedTime / gameState.cycleDuration;

    // Draw outer circle (border)
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.stroke();

    // Fill background
    ctx.fillStyle = this.settings.background;
    ctx.fill();

    // Draw day section (top portion of the clock - from -PI/2 to dayPortion of full circle)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    const dayEndAngle = -Math.PI / 2 + Math.PI * 2 * dayPortion;
    ctx.arc(x, y, radius - this.settings.borderWidth, -Math.PI / 2, dayEndAngle);
    ctx.closePath();
    ctx.fillStyle = this.clockSettings.dayColor;
    ctx.fill();
    ctx.restore();

    // Draw night section (remaining portion)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius - this.settings.borderWidth, dayEndAngle, -Math.PI / 2 + Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = this.clockSettings.nightColor;
    ctx.fill();
    ctx.restore();

    // Draw progress indicator (hand of the clock)
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = this.clockSettings.progressColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    // Calculate the angle for the progress indicator
    // Start from top (-PI/2) and rotate based on whether we're in day or night
    let progressAngle: number;
    if (gameState.isDay) {
      // During day: progress through the day portion
      progressAngle = -Math.PI / 2 + (Math.PI * 2 * dayPortion * cycleProgress);
    } else {
      // During night: start after day portion and progress through night
      progressAngle = dayEndAngle + (Math.PI * 2 * nightPortion * cycleProgress);
    }

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

    // Draw sun icon in day section
    ctx.save();
    ctx.font = this.clockSettings.iconFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Position sun icon in the middle of the day section
    const sunAngle = -Math.PI / 2 + (Math.PI * 2 * dayPortion) / 2;
    const iconDistance = radius * 0.6; // 60% from center
    const sunX = x + Math.cos(sunAngle) * iconDistance;
    const sunY = y + Math.sin(sunAngle) * iconDistance;
    ctx.fillText("☀️", sunX, sunY);
    ctx.restore();

    // Draw moon icon in night section
    ctx.save();
    ctx.font = this.clockSettings.iconFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // Position moon icon in the middle of the night section
    const nightMidAngle = dayEndAngle + (Math.PI * 2 * nightPortion) / 2;
    const moonX = x + Math.cos(nightMidAngle) * iconDistance;
    const moonY = y + Math.sin(nightMidAngle) * iconDistance;
    ctx.fillText("🌙", moonX, moonY);
    ctx.restore();

    // Draw day number in the center with outline for better contrast
    ctx.save();
    ctx.font = this.clockSettings.dayNumberFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw stroke (outline) for better contrast
    ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.strokeText(`Day ${gameState.dayNumber}`, x, y);

    // Draw fill text
    ctx.fillStyle = "white";
    ctx.fillText(`Day ${gameState.dayNumber}`, x, y);
    ctx.restore();

    this.restoreContext(ctx);
  }
}
