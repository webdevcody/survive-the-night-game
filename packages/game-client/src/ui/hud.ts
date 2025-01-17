import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";

const HUD_SETTINGS = {
  ControlsList: {
    background: "rgba(0, 0, 0, 0.8)",
    color: "rgb(255, 255, 255)",
    font: "32px Arial",
    lineHeight: 40,
    left: 20,
    top: 20,
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
  },
};

export class Hud {
  private showInstructions: boolean = true;
  private playerDeathMessages: { message: string; timestamp: number }[] = [];
  private playerDeathMessageTimeout: number = 5000;
  constructor() {}

  update(gameState: GameState): void {
    this.playerDeathMessages = this.playerDeathMessages.filter(
      (message) => Date.now() - message.timestamp < this.playerDeathMessageTimeout
    );
  }

  public toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  private getCycleText(gameState: GameState): string {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const remainingTime = Math.max(0, Math.ceil(gameState.cycleDuration - elapsedTime));
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    return `${timeOfDay} ${gameState.dayNumber} - ${remainingTime}s`;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width } = ctx.canvas;

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    const dayText = `Day ${gameState.dayNumber}`;
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    const cycleText = this.getCycleText(gameState);

    const dayTextWidth = ctx.measureText(dayText).width;
    const cycleTextWidth = ctx.measureText(cycleText).width;

    const margin = 50;
    const gap = 50;
    ctx.fillText(dayText, width - dayTextWidth - margin, margin);
    ctx.fillText(cycleText, width - cycleTextWidth - margin, margin + gap);

    const myPlayer = getPlayer(gameState);

    if (myPlayer) {
      const health = myPlayer.getHealth();
      const healthText = `Health: ${health}`;
      const healthTextWidth = ctx.measureText(healthText).width;
      ctx.fillText(healthText, width - healthTextWidth - margin, margin + gap * 2);
    }

    this.renderControlsList(ctx, gameState);
    this.renderPlayerDeathMessages(ctx);
  }

  public showPlayerDeath(playerId: string): void {
    this.playerDeathMessages.push({
      message: `${playerId} has died`,
      timestamp: Date.now(),
    });
  }

  public renderPlayerDeathMessages(ctx: CanvasRenderingContext2D): void {
    for (const message of this.playerDeathMessages) {
      const metrics = ctx.measureText(message.message);
      const x = (ctx.canvas.width - metrics.width) / 2;
      ctx.fillText(message.message, x, 50);
    }
  }

  public renderControlsList(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (!this.showInstructions) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      const text = 'Press "i" for instructions';
      ctx.font = "32px Arial";
      const metrics = ctx.measureText(text);

      // Draw background panel
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(10, 10, metrics.width + 20, 40);

      // Draw text
      ctx.fillStyle = "white";
      ctx.fillText(text, 20, 40);

      ctx.restore();
      return;
    }

    const regularText =
      "Left [A]\n" +
      "Right [D]\n" +
      "Down [S]\n" +
      "Up [W]\n" +
      "Fire [SPACE]\n" +
      "Consume [F]\n" +
      "Harvest [E]\n" +
      "Craft [Q]\n" +
      "Toggle Instructions [I]";

    const craftingText = "Down [S]\nUp [W]\nCraft [SPACE]";
    const innerText = gameState.crafting ? craftingText : regularText;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.font = HUD_SETTINGS.ControlsList.font;

    const lines = innerText.trim().split("\n");
    let maxLineWidth = 0;
    let maxLineHeight = 0;

    for (const line of lines) {
      const metrics = ctx.measureText(line);

      if (maxLineWidth < metrics.width) {
        maxLineWidth = metrics.width;
      }

      if (maxLineHeight < metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent) {
        maxLineHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
      }
    }

    const lineHeight =
      HUD_SETTINGS.ControlsList.lineHeight > maxLineHeight
        ? HUD_SETTINGS.ControlsList.lineHeight
        : maxLineHeight;

    const height =
      lineHeight * lines.length +
      HUD_SETTINGS.ControlsList.padding.top +
      HUD_SETTINGS.ControlsList.padding.bottom;

    const width =
      maxLineWidth +
      HUD_SETTINGS.ControlsList.padding.left +
      HUD_SETTINGS.ControlsList.padding.right;

    ctx.fillStyle = HUD_SETTINGS.ControlsList.background;
    ctx.fillRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

    ctx.textBaseline = "top";
    ctx.fillStyle = HUD_SETTINGS.ControlsList.color;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const offsetTop = i * lineHeight + (HUD_SETTINGS.ControlsList.lineHeight - maxLineHeight) / 2;

      ctx.fillText(
        line,
        HUD_SETTINGS.ControlsList.left + HUD_SETTINGS.ControlsList.padding.left,
        offsetTop + HUD_SETTINGS.ControlsList.top + HUD_SETTINGS.ControlsList.padding.top
      );
    }

    ctx.restore();
  }
}
