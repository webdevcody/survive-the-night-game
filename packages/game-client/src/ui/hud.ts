import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { PlayerClient } from "@/entities/player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { ClientDestructible } from "@/extensions/destructible";
import { Zombies, VERSION } from "@shared/constants";
import { Minimap } from "./minimap";
import { Leaderboard } from "./leaderboard";
import { SoundManager } from "@/managers/sound-manager";
import { AssetManager } from "@/managers/asset";
import { ClockPanel, StatPanel, TextPanel } from "./panels";

const HUD_SETTINGS = {
  ControlsList: {
    background: "rgba(0, 0, 0, 0.8)",
    color: "rgb(255, 255, 255)",
    font: "28px Arial",
    lineHeight: 36,
    left: 20,
    top: 20,
    padding: {
      bottom: 16,
      left: 20,
      right: 20,
      top: 16,
    },
    borderRadius: 8,
  },
  BottomRightPanels: {
    right: 20,
    bottom: 20,
    gap: 8,
    padding: 8,
    background: "rgba(0, 0, 0, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
    font: "20px Arial",
    versionColor: "rgba(255, 255, 0, 0.8)",
    fpsColor: "white",
    pingColors: {
      excellent: "rgb(0, 255, 0)", // Green: < 50ms
      good: "rgb(255, 255, 0)", // Yellow: 50-100ms
      fair: "rgb(255, 165, 0)", // Orange: 100-150ms
      poor: "rgb(255, 0, 0)", // Red: > 150ms
    },
  },
  MuteButton: {
    left: 460, // Position to the right of minimap (40 + 400 + 20)
    bottom: 40, // Same bottom position as minimap
    width: 60,
    height: 60,
    background: "rgba(0, 0, 0, 0.7)",
    hoverBackground: "rgba(0, 0, 0, 0.9)",
    font: "36px Arial",
  },
  Clock: {
    radius: 93,
    padding: 0,
    background: "rgba(0, 0, 0, 0.9)",
    borderColor: "rgba(100, 100, 100, 0.8)",
    borderWidth: 3,
    font: "21px Arial",
    dayNumberFont: "bold 27px Arial",
    iconFont: "37px Arial",
    dayColor: "rgba(255, 215, 100, 0.9)",
    nightColor: "rgba(40, 40, 80, 0.9)",
    progressColor: "rgba(255, 255, 255, 0.9)",
    right: 40,
    top: 40,
  },
  MinimapStats: {
    left: 460, // Position to the right of minimap (40 + 400 + 20)
    bottom: 260, // Start above the mute button
    gap: 12, // Gap between stat panels
    padding: 8,
    background: "rgba(0, 0, 0, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
    font: "24px Arial",
    iconSize: 24,
    spacing: 8,
  },
};

export class Hud {
  private showInstructions: boolean = false;
  private gameMessages: { message: string; timestamp: number }[] = [];
  private messageTimeout: number = 5000;
  private mapManager: MapManager;
  private currentPing: number = 0;
  private lastPingUpdate: number = 0;
  private chatWidget: ChatWidget;
  private currentFps: number = 0;
  private minimap: Minimap;
  private leaderboard: Leaderboard;
  private soundManager: SoundManager;
  private assetManager: AssetManager;
  private clockPanel: ClockPanel;
  private alivePlayersPanel: StatPanel;
  private totalPlayersPanel: StatPanel;
  private zombiesPanel: StatPanel;
  private killsPanel: StatPanel;
  private versionPanel: TextPanel;
  private fpsPanel: TextPanel;
  private pingPanel: TextPanel;

  constructor(mapManager: MapManager, soundManager: SoundManager, assetManager: AssetManager) {
    this.mapManager = mapManager;
    this.soundManager = soundManager;
    this.assetManager = assetManager;
    this.chatWidget = new ChatWidget();
    this.minimap = new Minimap(mapManager);
    this.leaderboard = new Leaderboard();

    // Initialize clock panel (top right)
    this.clockPanel = new ClockPanel({
      padding: HUD_SETTINGS.Clock.padding,
      background: HUD_SETTINGS.Clock.background,
      borderColor: HUD_SETTINGS.Clock.borderColor,
      borderWidth: HUD_SETTINGS.Clock.borderWidth,
      radius: HUD_SETTINGS.Clock.radius,
      font: HUD_SETTINGS.Clock.font,
      dayNumberFont: HUD_SETTINGS.Clock.dayNumberFont,
      iconFont: HUD_SETTINGS.Clock.iconFont,
      x: 0, // Will be calculated in render
      y: 0, // Will be calculated in render
      dayColor: HUD_SETTINGS.Clock.dayColor,
      nightColor: HUD_SETTINGS.Clock.nightColor,
      progressColor: HUD_SETTINGS.Clock.progressColor,
    });

    // Initialize stat panels (right of minimap)
    this.alivePlayersPanel = new StatPanel(
      {
        padding: HUD_SETTINGS.MinimapStats.padding,
        background: HUD_SETTINGS.MinimapStats.background,
        borderColor: HUD_SETTINGS.MinimapStats.borderColor,
        borderWidth: HUD_SETTINGS.MinimapStats.borderWidth,
        x: 0,
        y: 0,
        icon: "👥",
        font: HUD_SETTINGS.MinimapStats.font,
        iconSize: HUD_SETTINGS.MinimapStats.iconSize,
        spacing: HUD_SETTINGS.MinimapStats.spacing,
      },
      (gameState) => `${this.getAlivePlayers(gameState)}`
    );

    this.totalPlayersPanel = new StatPanel(
      {
        padding: HUD_SETTINGS.MinimapStats.padding,
        background: HUD_SETTINGS.MinimapStats.background,
        borderColor: HUD_SETTINGS.MinimapStats.borderColor,
        borderWidth: HUD_SETTINGS.MinimapStats.borderWidth,
        x: 0,
        y: 0,
        icon: "👤",
        font: HUD_SETTINGS.MinimapStats.font,
        iconSize: HUD_SETTINGS.MinimapStats.iconSize,
        spacing: HUD_SETTINGS.MinimapStats.spacing,
      },
      (gameState) => `${this.getTotalPlayers(gameState)}`
    );

    this.zombiesPanel = new StatPanel(
      {
        padding: HUD_SETTINGS.MinimapStats.padding,
        background: HUD_SETTINGS.MinimapStats.background,
        borderColor: HUD_SETTINGS.MinimapStats.borderColor,
        borderWidth: HUD_SETTINGS.MinimapStats.borderWidth,
        x: 0,
        y: 0,
        icon: "🧟",
        font: HUD_SETTINGS.MinimapStats.font,
        iconSize: HUD_SETTINGS.MinimapStats.iconSize,
        spacing: HUD_SETTINGS.MinimapStats.spacing,
      },
      (gameState) => `${this.getAliveZombies(gameState)}`
    );

    this.killsPanel = new StatPanel(
      {
        padding: HUD_SETTINGS.MinimapStats.padding,
        background: HUD_SETTINGS.MinimapStats.background,
        borderColor: HUD_SETTINGS.MinimapStats.borderColor,
        borderWidth: HUD_SETTINGS.MinimapStats.borderWidth,
        x: 0,
        y: 0,
        icon: "💀",
        font: HUD_SETTINGS.MinimapStats.font,
        iconSize: HUD_SETTINGS.MinimapStats.iconSize,
        spacing: HUD_SETTINGS.MinimapStats.spacing,
      },
      (gameState) => {
        const player = getPlayer(gameState);
        return player ? `${player.getKills()}` : "0";
      }
    );

    // Initialize bottom right panels
    this.versionPanel = new TextPanel({
      padding: HUD_SETTINGS.BottomRightPanels.padding,
      background: HUD_SETTINGS.BottomRightPanels.background,
      borderColor: HUD_SETTINGS.BottomRightPanels.borderColor,
      borderWidth: HUD_SETTINGS.BottomRightPanels.borderWidth,
      x: 0,
      y: 0,
      text: VERSION,
      font: HUD_SETTINGS.BottomRightPanels.font,
      textColor: HUD_SETTINGS.BottomRightPanels.versionColor,
    });

    this.fpsPanel = new TextPanel({
      padding: HUD_SETTINGS.BottomRightPanels.padding,
      background: HUD_SETTINGS.BottomRightPanels.background,
      borderColor: HUD_SETTINGS.BottomRightPanels.borderColor,
      borderWidth: HUD_SETTINGS.BottomRightPanels.borderWidth,
      x: 0,
      y: 0,
      text: "0 FPS",
      font: HUD_SETTINGS.BottomRightPanels.font,
      textColor: HUD_SETTINGS.BottomRightPanels.fpsColor,
    });

    this.pingPanel = new TextPanel({
      padding: HUD_SETTINGS.BottomRightPanels.padding,
      background: HUD_SETTINGS.BottomRightPanels.background,
      borderColor: HUD_SETTINGS.BottomRightPanels.borderColor,
      borderWidth: HUD_SETTINGS.BottomRightPanels.borderWidth,
      x: 0,
      y: 0,
      text: "0ms",
      font: HUD_SETTINGS.BottomRightPanels.font,
      textColor: HUD_SETTINGS.BottomRightPanels.pingColors.excellent,
    });
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
    // Update ping panel
    this.pingPanel.setText(`${Math.round(ping)}ms`);
    (this.pingPanel as any).textSettings.textColor = this.getPingColor(ping);
  }

  private getPingColor(ping: number): string {
    if (ping < 50) return HUD_SETTINGS.BottomRightPanels.pingColors.excellent;
    if (ping < 100) return HUD_SETTINGS.BottomRightPanels.pingColors.good;
    if (ping < 150) return HUD_SETTINGS.BottomRightPanels.pingColors.fair;
    return HUD_SETTINGS.BottomRightPanels.pingColors.poor;
  }

  public updateFps(fps: number): void {
    this.currentFps = fps;
    // Update FPS panel
    this.fpsPanel.setText(`${fps} FPS`);
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const { width, height } = ctx.canvas;

    // Render minimap first
    this.minimap.render(ctx, gameState);

    // Render clock panel in top right
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const clockX = width - HUD_SETTINGS.Clock.right - HUD_SETTINGS.Clock.radius;
    const clockY = HUD_SETTINGS.Clock.top + HUD_SETTINGS.Clock.radius;
    // Update clock position
    (this.clockPanel as any).clockSettings.x = clockX;
    (this.clockPanel as any).clockSettings.y = clockY;
    this.clockPanel.render(ctx, gameState);
    ctx.restore();

    // Render stat panels to the right of minimap
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const statsSettings = HUD_SETTINGS.MinimapStats;
    const statsX = statsSettings.left;
    let statsY = height - statsSettings.bottom;

    // Update positions and render each stat panel
    (this.alivePlayersPanel as any).statSettings.x = statsX;
    (this.alivePlayersPanel as any).statSettings.y = statsY;
    this.alivePlayersPanel.render(ctx, gameState);
    statsY -= this.alivePlayersPanel.getHeight(ctx) + statsSettings.gap;

    (this.totalPlayersPanel as any).statSettings.x = statsX;
    (this.totalPlayersPanel as any).statSettings.y = statsY;
    this.totalPlayersPanel.render(ctx, gameState);
    statsY -= this.totalPlayersPanel.getHeight(ctx) + statsSettings.gap;

    (this.zombiesPanel as any).statSettings.x = statsX;
    (this.zombiesPanel as any).statSettings.y = statsY;
    this.zombiesPanel.render(ctx, gameState);
    statsY -= this.zombiesPanel.getHeight(ctx) + statsSettings.gap;

    (this.killsPanel as any).statSettings.x = statsX;
    (this.killsPanel as any).statSettings.y = statsY;
    this.killsPanel.render(ctx, gameState);

    ctx.restore();

    // Render bottom right panels (version, FPS, ping)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bottomRightSettings = HUD_SETTINGS.BottomRightPanels;
    let currentX = width - bottomRightSettings.right;
    const panelY = height - bottomRightSettings.bottom;

    // Render version panel (rightmost)
    const versionWidth = this.versionPanel.getWidth(ctx);
    (this.versionPanel as any).textSettings.x = currentX - versionWidth;
    (this.versionPanel as any).textSettings.y = panelY - this.versionPanel.getHeight();
    this.versionPanel.render(ctx, gameState);
    currentX -= versionWidth + bottomRightSettings.gap;

    // Render ping panel
    const pingWidth = this.pingPanel.getWidth(ctx);
    (this.pingPanel as any).textSettings.x = currentX - pingWidth;
    (this.pingPanel as any).textSettings.y = panelY - this.pingPanel.getHeight();
    this.pingPanel.render(ctx, gameState);
    currentX -= pingWidth + bottomRightSettings.gap;

    // Render FPS panel
    const fpsWidth = this.fpsPanel.getWidth(ctx);
    (this.fpsPanel as any).textSettings.x = currentX - fpsWidth;
    (this.fpsPanel as any).textSettings.y = panelY - this.fpsPanel.getHeight();
    this.fpsPanel.render(ctx, gameState);

    ctx.restore();

    this.renderControlsList(ctx, gameState);
    this.renderGameMessages(ctx);
    this.renderMuteButton(ctx);
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

  private renderMuteButton(ctx: CanvasRenderingContext2D): void {
    const { height } = ctx.canvas;
    const settings = HUD_SETTINGS.MuteButton;
    const isMuted = this.soundManager.getMuteState();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to work in canvas pixel coordinates

    // Calculate button position (to the right of minimap)
    const x = settings.left;
    const y = height - settings.bottom - settings.height;

    // Draw button background
    ctx.fillStyle = settings.background;
    ctx.fillRect(x, y, settings.width, settings.height);

    // Draw border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, settings.width, settings.height);

    // Draw icon (speaker symbol)
    ctx.fillStyle = "white";
    ctx.font = settings.font;
    const icon = isMuted ? "🔇" : "🔊";
    const iconMetrics = ctx.measureText(icon);
    const iconX = x + (settings.width - iconMetrics.width) / 2;
    const iconY = y + settings.height / 2 + 14; // Adjust for vertical centering

    ctx.fillText(icon, iconX, iconY);

    ctx.restore();
  }

  public renderControlsList(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!this.showInstructions) {
      const text = 'Press "I" for controls';
      ctx.font = "24px Arial";
      const metrics = ctx.measureText(text);

      const padding = 12;
      const width = metrics.width + padding * 2;
      const height = 36;

      // Draw background panel
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

      // Draw border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.strokeRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

      // Draw text
      ctx.fillStyle = "white";
      ctx.textBaseline = "middle";
      ctx.fillText(
        text,
        HUD_SETTINGS.ControlsList.left + padding,
        HUD_SETTINGS.ControlsList.top + height / 2
      );

      ctx.restore();
      return;
    }

    const regularText =
      "Movement: W A S D\n" +
      "Fire: SPACE\n" +
      "Consume: F\n" +
      "Harvest: E\n" +
      "Craft: Q\n" +
      "Drop Item: G\n" +
      "Chat: Y\n" +
      "Controls: I\n" +
      "Mute: M";

    const craftingText = "Navigate: W S\nCraft: SPACE";
    const innerText = gameState.crafting ? craftingText : regularText;

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

    // Draw background
    ctx.fillStyle = HUD_SETTINGS.ControlsList.background;
    ctx.fillRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

    // Draw border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(HUD_SETTINGS.ControlsList.left, HUD_SETTINGS.ControlsList.top, width, height);

    // Draw text
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

  public saveChatMessage(message: string): void {
    this.chatWidget.saveChatMessage(message);
  }

  public handleClick(x: number, y: number, canvasHeight: number): boolean {
    // Check if click is on mute button
    const settings = HUD_SETTINGS.MuteButton;
    const buttonX = settings.left;
    const buttonY = canvasHeight - settings.bottom - settings.height;

    if (
      x >= buttonX &&
      x <= buttonX + settings.width &&
      y >= buttonY &&
      y <= buttonY + settings.height
    ) {
      this.soundManager.toggleMute();
      return true; // Click was handled
    }

    return false; // Click was not on the button
  }
}
