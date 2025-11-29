import { GameState } from "@/state";
import { VotableGameMode } from "@shared/types/voting";

export interface VotingPanelSettings {
  onVote: (mode: VotableGameMode) => void;
}

interface ModeColumn {
  mode: VotableGameMode;
  label: string;
  disabled: boolean;
}

export class VotingPanel {
  private settings: VotingPanelSettings;
  private selectedMode: VotableGameMode | null = null;
  private columnBounds: { mode: VotableGameMode; x: number; y: number; width: number; height: number }[] = [];

  private readonly modes: ModeColumn[] = [
    { mode: "waves", label: "WAVES", disabled: false },
    { mode: "battle_royale", label: "BATTLE ROYALE", disabled: false },
    { mode: "infection", label: "INFECTION", disabled: true },
  ];

  constructor(settings: VotingPanelSettings) {
    this.settings = settings;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const votingState = gameState.votingState;
    if (!votingState?.isVotingActive) {
      return;
    }

    // Save context and reset transform
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Panel dimensions
    const panelWidth = Math.min(700, canvasWidth - 40);
    const panelHeight = 350;
    const panelX = (canvasWidth - panelWidth) / 2;
    const panelY = (canvasHeight - panelHeight) / 2;

    // Draw semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw main panel background
    ctx.fillStyle = "rgba(20, 20, 30, 0.95)";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);

    // Draw panel border
    ctx.strokeStyle = "#4a9eff";
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw header
    ctx.font = "bold 28px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("VOTE FOR NEXT MODE", canvasWidth / 2, panelY + 40);

    // Calculate remaining time
    const serverTime = Date.now() - gameState.serverTimeOffset;
    const remainingMs = Math.max(0, votingState.votingEndTime - serverTime);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    // Draw countdown timer
    const timerColor = remainingSeconds <= 5 ? "#ff4444" : "#ffffff";
    ctx.font = "bold 24px Arial";
    ctx.fillStyle = timerColor;
    ctx.fillText(`${remainingSeconds}s remaining`, canvasWidth / 2, panelY + 75);

    // Draw columns
    const columnWidth = (panelWidth - 40) / 3;
    const columnHeight = 200;
    const columnY = panelY + 100;
    const columnGap = 10;

    // Clear column bounds for click detection
    this.columnBounds = [];

    for (let i = 0; i < this.modes.length; i++) {
      const modeInfo = this.modes[i];
      const columnX = panelX + 20 + i * (columnWidth + columnGap);
      const isDisabled = votingState.disabledModes.includes(modeInfo.mode);
      const isSelected = this.selectedMode === modeInfo.mode;
      const voteCount = votingState.votes[modeInfo.mode];

      // Store bounds for click detection
      if (!isDisabled) {
        this.columnBounds.push({
          mode: modeInfo.mode,
          x: columnX,
          y: columnY,
          width: columnWidth,
          height: columnHeight,
        });
      }

      // Draw column background
      if (isDisabled) {
        ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
      } else if (isSelected) {
        ctx.fillStyle = "rgba(74, 158, 255, 0.4)";
      } else {
        ctx.fillStyle = "rgba(40, 40, 50, 0.9)";
      }
      ctx.fillRect(columnX, columnY, columnWidth, columnHeight);

      // Draw column border
      if (isSelected) {
        ctx.strokeStyle = "#4a9eff";
        ctx.lineWidth = 3;
      } else if (isDisabled) {
        ctx.strokeStyle = "#444444";
        ctx.lineWidth = 1;
      } else {
        ctx.strokeStyle = "#666666";
        ctx.lineWidth = 2;
      }
      ctx.strokeRect(columnX, columnY, columnWidth, columnHeight);

      // Draw mode name
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = isDisabled ? "#666666" : "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(modeInfo.label, columnX + columnWidth / 2, columnY + 50);

      // Draw vote count or disabled message
      if (isDisabled) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#888888";
        ctx.fillText("COMING SOON", columnX + columnWidth / 2, columnY + 100);
      } else {
        ctx.font = "bold 36px Arial";
        ctx.fillStyle = "#4a9eff";
        ctx.fillText(String(voteCount), columnX + columnWidth / 2, columnY + 110);

        ctx.font = "16px Arial";
        ctx.fillStyle = "#aaaaaa";
        ctx.fillText(voteCount === 1 ? "vote" : "votes", columnX + columnWidth / 2, columnY + 135);
      }

      // Draw selected indicator
      if (isSelected) {
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#4a9eff";
        ctx.fillText("YOUR VOTE", columnX + columnWidth / 2, columnY + columnHeight - 20);
      }

      // Draw hover hint for non-disabled columns
      if (!isDisabled && !isSelected) {
        ctx.font = "12px Arial";
        ctx.fillStyle = "#888888";
        ctx.fillText("Click to vote", columnX + columnWidth / 2, columnY + columnHeight - 20);
      }
    }

    // Restore context
    ctx.restore();
  }

  public handleClick(x: number, y: number, canvasWidth: number, canvasHeight: number): boolean {
    // Check if click is within any column bounds
    for (const bounds of this.columnBounds) {
      if (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      ) {
        this.selectedMode = bounds.mode;
        this.settings.onVote(bounds.mode);
        return true;
      }
    }
    return false;
  }

  public reset(): void {
    this.selectedMode = null;
    this.columnBounds = [];
  }

  public getSelectedMode(): VotableGameMode | null {
    return this.selectedMode;
  }
}
