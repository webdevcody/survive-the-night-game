import { GameState } from "@/state";
import { getConfig } from "@shared/config";
import { WaveState } from "@shared/types/wave";
import { Panel, PanelSettings } from "./panel";

interface WavePanelSettings extends PanelSettings {
  width: number;
  height: number;
  font: string;
  timerFont: string;
  modeFont: string;
  x: number;
  y: number;
  textColor: string;
  timerColor: string;
  modeColor: string;
}

export class WavePanel extends Panel {
  private waveSettings: WavePanelSettings;

  constructor(settings: WavePanelSettings) {
    super(settings);
    this.waveSettings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.resetTransform(ctx);

    const { x, y, width, height } = this.waveSettings;
    // Calculate server time to account for clock skew
    // serverTimeOffset = clientTime - serverTime, so serverTime = clientTime - serverTimeOffset
    const serverTime = Date.now() - gameState.serverTimeOffset;
    const elapsedTime = (serverTime - gameState.phaseStartTime) / 1000;
    const remainingTime = Math.max(0, gameState.phaseDuration - elapsedTime);

    // Determine text based on wave state and game mode
    const isPreparation = gameState.waveState === WaveState.PREPARATION;
    const isBattleRoyale = gameState.gameMode === "battle_royale";
    const isInfection = gameState.gameMode === "infection";
    let displayText: string;
    let timerText: string;
    let modeText: string;

    if (isBattleRoyale) {
      modeText = "Mode: Royale";
    } else if (isInfection) {
      modeText = "Mode: Infection";
    } else {
      modeText = "Mode: Waves";
    }

    if (isBattleRoyale) {
      // Battle Royale mode - show arena constriction timer
      displayText = "ARENA SHRINKS IN";
      timerText = this.formatTime(remainingTime);
    } else if (isInfection) {
      // Infection mode - show survival countdown
      const gameDuration = getConfig().infection.GAME_DURATION_MS / 1000; // Convert to seconds
      const infectionRemaining = Math.max(0, gameDuration - elapsedTime);
      displayText = "SURVIVE FOR";
      timerText = this.formatTime(infectionRemaining);
    } else {
      // Waves mode - show wave timer
      if (isPreparation) {
        // During preparation, show countdown to current wave starting
        displayText = `WAVE ${gameState.waveNumber} STARTS IN`;
        timerText = this.formatTime(remainingTime);
      } else if (gameState.waveState === WaveState.ACTIVE) {
        // During active wave, show countdown to wave ending
        displayText = `WAVE ${gameState.waveNumber} ENDS IN`;
        timerText = this.formatTime(remainingTime);
      } else {
        // COMPLETED or unknown state - show preparation for next wave
        displayText = `WAVE ${gameState.waveNumber + 1} STARTS IN`;
        timerText = this.formatTime(getConfig().wave.PREPARATION_DURATION);
      }
    }

    // Draw background panel
    ctx.fillStyle = this.settings.background;
    ctx.fillRect(x, y, width, height);

    // Draw border (borderWidth is set dynamically by HUD)
    ctx.strokeStyle = this.settings.borderColor;
    ctx.lineWidth = this.settings.borderWidth;
    ctx.strokeRect(x, y, width, height);

    // Draw text (top)
    ctx.save();
    ctx.font = this.waveSettings.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.waveSettings.textColor;
    ctx.fillText(displayText, x + width / 2, y + height * 0.25);
    ctx.restore();

    // Draw digital timer (middle) with glow effect
    ctx.save();
    ctx.font = this.waveSettings.timerFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Glow effect
    ctx.shadowColor = this.waveSettings.timerColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = this.waveSettings.timerColor;
    ctx.fillText(timerText, x + width / 2, y + height * 0.55);

    // Stronger glow
    ctx.shadowBlur = 20;
    ctx.fillText(timerText, x + width / 2, y + height * 0.55);

    ctx.restore();

    // Draw game mode (bottom)
    ctx.save();
    ctx.font = this.waveSettings.modeFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.waveSettings.modeColor;
    ctx.fillText(modeText, x + width / 2, y + height * 0.85);
    ctx.restore();

    this.restoreContext(ctx);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  public getWidth(): number {
    return this.waveSettings.width + this.settings.padding * 2;
  }

  public getHeight(): number {
    return this.waveSettings.height + this.settings.padding * 2;
  }
}
