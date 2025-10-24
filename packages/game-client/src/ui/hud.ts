import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { PlayerClient } from "@/entities/player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { ClientDestructible } from "@/extensions/destructible";
import { Zombies, VERSION } from "@shared/constants";
import { Minimap } from "./minimap";
import { Leaderboard } from "./leaderboard";

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
  UpcomingFeatures: {
    background: "rgba(0, 0, 0, 0.8)",
    color: "rgb(255, 255, 255)",
    font: "32px Arial",
    lineHeight: 40,
    right: 20,
    top: 20,
    padding: {
      bottom: 20,
      left: 20,
      right: 20,
      top: 20,
    },
    title: "TODO (dev log)",
    features: ["- bear trap", "- more biomes"],
  },
  Ping: {
    right: 140,
    bottom: 50,
    font: "24px Arial",
    colors: {
      excellent: "rgb(0, 255, 0)", // Green: < 50ms
      good: "rgb(255, 255, 0)", // Yellow: 50-100ms
      fair: "rgb(255, 165, 0)", // Orange: 100-150ms
      poor: "rgb(255, 0, 0)", // Red: > 150ms
    },
  },
};

export class Hud {
  private showInstructions: boolean = true;
  private gameMessages: { message: string; timestamp: number }[] = [];
  private messageTimeout: number = 5000;
  private mapManager: MapManager;
  private currentPing: number = 0;
  private lastPingUpdate: number = 0;
  private chatWidget: ChatWidget;
  private currentFps: number = 0;
  private minimap: Minimap;
  private leaderboard: Leaderboard;

  constructor(mapManager: MapManager) {
    this.mapManager = mapManager;
    this.chatWidget = new ChatWidget();
    this.minimap = new Minimap(mapManager);
    this.leaderboard = new Leaderboard();
  }

  public update(gameState: GameState): void {
    this.gameMessages = this.gameMessages.filter(
      (message) => Date.now() - message.timestamp < this.messageTimeout
    );
    this.chatWidget.update();
  }

  public toggleInstructions(): void {
    this.showInstructions = !this.showInstructions;
  }

  private getCycleText(gameState: GameState): string {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - gameState.cycleStartTime) / 1000;
    const remainingTime = Math.max(0, Math.ceil(gameState.cycleDuration - elapsedTime));
    return `${remainingTime}s until ${gameState.isDay ? "night" : "day"}`;
  }

  private getAlivePlayers(gameState: GameState): number {
    return gameState.entities.filter((entity) => entity instanceof PlayerClient && !entity.isDead())
      .length;
  }

  private getTotalPlayers(gameState: GameState): number {
    return gameState.entities.filter((entity) => entity instanceof PlayerClient).length;
  }

  private getAliveZombies(gameState: GameState): number {
    return gameState.entities.filter(
      (entity) => Zombies.includes(entity.getType()) && !entity.getExt(ClientDestructible).isDead()
    ).length;
  }

  public updatePing(ping: number): void {
    this.currentPing = ping;
    this.lastPingUpdate = Date.now();
  }

  private getPingColor(ping: number): string {
    if (ping < 50) return HUD_SETTINGS.Ping.colors.excellent;
    if (ping < 100) return HUD_SETTINGS.Ping.colors.good;
    if (ping < 150) return HUD_SETTINGS.Ping.colors.fair;
    return HUD_SETTINGS.Ping.colors.poor;
  }

  public updateFps(fps: number): void {
    this.currentFps = fps;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width, height } = ctx.canvas;

    // Render minimap first
    this.minimap.render(ctx, gameState);

    // Add version number in bottom right
    ctx.save();
    ctx.font = "32px Arial";
    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
    const versionText = VERSION;
    const versionMetrics = ctx.measureText(versionText);
    ctx.fillText(versionText, width - versionMetrics.width - 16, height - 50);
    ctx.restore();

    ctx.font = "32px Arial";
    ctx.fillStyle = "white";

    const dayText = `Day ${gameState.dayNumber}`;
    const timeOfDay = gameState.isDay ? "Day" : "Night";
    const cycleText = this.getCycleText(gameState);
    const playersText = `Alive Players: ${this.getAlivePlayers(gameState)}`;
    const totalPlayers = `Total Players: ${this.getTotalPlayers(gameState)}`;
    const zombiesText = `Zombies Remaining: ${this.getAliveZombies(gameState)}`;

    const dayTextWidth = ctx.measureText(dayText).width;
    const cycleTextWidth = ctx.measureText(cycleText).width;
    const playersTextWidth = ctx.measureText(playersText).width;
    const totalPlayersWidth = ctx.measureText(totalPlayers).width;
    const zombiesTextWidth = ctx.measureText(zombiesText).width;

    const margin = 50;
    const gap = 50;
    ctx.fillText(dayText, width - dayTextWidth - margin, margin);
    ctx.fillText(cycleText, width - cycleTextWidth - margin, margin + gap);
    ctx.fillText(playersText, width - playersTextWidth - margin, margin + gap * 3);
    ctx.fillText(totalPlayers, width - totalPlayersWidth - margin, margin + gap * 4);
    ctx.fillText(zombiesText, width - zombiesTextWidth - margin, margin + gap * 5);

    const myPlayer = getPlayer(gameState);

    if (myPlayer) {
      const health = myPlayer.getHealth();
      const healthText = `Health: ${health}`;
      const kills = myPlayer.getKills();
      const killsText = `Kills: ${kills}`;
      const stamina = myPlayer.getStamina();
      const maxStamina = myPlayer.getMaxStamina();
      const staminaText = `Stamina: ${Math.round(stamina)}/${maxStamina}`;

      const healthTextWidth = ctx.measureText(healthText).width;
      const killsTextWidth = ctx.measureText(killsText).width;
      const staminaTextWidth = ctx.measureText(staminaText).width;

      ctx.fillText(healthText, width - healthTextWidth - margin, margin + gap * 2);
      ctx.fillText(staminaText, width - staminaTextWidth - margin, margin + gap * 2.5);
      ctx.fillText(killsText, width - killsTextWidth - margin, margin + gap * 6);
    }

    // Render FPS and ping
    ctx.font = HUD_SETTINGS.Ping.font;

    // Render FPS first
    const fpsText = `${this.currentFps} FPS`;
    const fpsMetrics = ctx.measureText(fpsText);
    ctx.fillStyle = "white";
    ctx.fillText(
      fpsText,
      ctx.canvas.width - fpsMetrics.width - HUD_SETTINGS.Ping.right - 100,
      ctx.canvas.height - HUD_SETTINGS.Ping.bottom
    );

    // Then render ping
    const pingText = `${Math.round(this.currentPing)}ms`;
    const pingMetrics = ctx.measureText(pingText);
    ctx.fillStyle = this.getPingColor(this.currentPing);
    ctx.fillText(
      pingText,
      ctx.canvas.width - pingMetrics.width - HUD_SETTINGS.Ping.right,
      ctx.canvas.height - HUD_SETTINGS.Ping.bottom
    );

    this.renderControlsList(ctx, gameState);
    this.renderGameMessages(ctx);
    this.leaderboard.render(ctx, gameState);
    this.chatWidget.render(ctx, gameState);
  }

  public addMessage(message: string): void {
    this.gameMessages.push({
      message,
      timestamp: Date.now(),
    });
  }

  public showPlayerDeath(playerId: string): void {
    this.addMessage(`${playerId} has died`);
  }

  public showPlayerJoined(displayName: string): void {
    this.addMessage(`${displayName} has joined the game`);
  }

  private renderGameMessages(ctx: CanvasRenderingContext2D): void {
    ctx.font = "32px Arial";
    ctx.fillStyle = "white";
    const margin = 50;
    const gap = 40;

    this.gameMessages.forEach((message, index) => {
      const metrics = ctx.measureText(message.message);
      const x = (ctx.canvas.width - metrics.width) / 2;
      ctx.fillText(message.message, x, margin + index * gap);
    });
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
      "Drop Item [G]\n" +
      "Chat [Y]\n" +
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

    // Render upcoming features
    if (this.showInstructions) {
      const features = HUD_SETTINGS.UpcomingFeatures;
      ctx.font = features.font;

      // Calculate dimensions
      const featureLines = [features.title, ...features.features];
      let featureMaxWidth = 0;

      for (const line of featureLines) {
        const metrics = ctx.measureText(line);
        if (featureMaxWidth < metrics.width) {
          featureMaxWidth = metrics.width;
        }
      }

      const featureWidth = featureMaxWidth + features.padding.left + features.padding.right;

      const featureHeight =
        lineHeight * featureLines.length + features.padding.top + features.padding.bottom;

      // Draw background - position directly to the right of instructions panel
      ctx.fillStyle = features.background;
      ctx.fillRect(
        HUD_SETTINGS.ControlsList.left + width + 10, // 10px gap between panels
        HUD_SETTINGS.ControlsList.top,
        featureWidth,
        featureHeight
      );

      // Draw text
      ctx.fillStyle = features.color;
      ctx.textBaseline = "top";

      for (let i = 0; i < featureLines.length; i++) {
        const line = featureLines[i];
        const offsetTop = i * lineHeight;

        // Make title bold
        if (i === 0) {
          ctx.font = "bold " + features.font;
        } else {
          ctx.font = features.font;
        }

        ctx.fillText(
          line,
          HUD_SETTINGS.ControlsList.left + width + 10 + features.padding.left,
          offsetTop + features.top + features.padding.top
        );
      }
    }

    ctx.restore();
  }

  public setShowPlayerList(show: boolean): void {
    this.leaderboard.setShow(show);
  }

  // Delegate chat methods to ChatWidget
  public toggleChatInput(): void {
    this.chatWidget.toggleChatInput();
  }

  public updateChatInput(key: string): void {
    this.chatWidget.updateChatInput(key);
  }

  public getChatInput(): string {
    return this.chatWidget.getChatInput();
  }

  public clearChatInput(): void {
    this.chatWidget.clearChatInput();
  }

  public addChatMessage(playerId: string, message: string): void {
    this.chatWidget.addChatMessage(playerId, message);
  }
}
