import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { PlayerClient } from "@/entities/player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { ClientDestructible } from "@/extensions/destructible";
import { Zombies } from "@shared/constants";
import { Minimap } from "./minimap";
import { FullScreenMap } from "./fullscreen-map";
import { Leaderboard } from "./leaderboard";
import { SoundManager } from "@/managers/sound-manager";
import { AssetManager } from "@/managers/asset";
import { WavePanel, StatPanel, TextPanel, ResourcesPanel } from "./panels";
import { getConfig } from "@shared/config";

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
  Wave: {
    width: 300,
    height: 90,
    padding: 12,
    background: "rgba(0, 0, 0, 0.85)",
    borderColor: "rgba(200, 50, 50, 0.8)", // Red border
    borderWidth: 3,
    font: "18px Arial",
    timerFont: "bold 36px monospace", // Monospace for digital clock feel
    textColor: "rgba(255, 255, 255, 0.9)",
    timerColor: "rgba(255, 50, 50, 1)", // Bright red for timer
    right: 40,
    top: 40,
  },
  Resources: {
    padding: 12,
    background: "rgba(0, 0, 0, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
    font: "28px Arial",
    spriteSize: 32,
    iconGap: 12,
    resourceGap: 8,
    right: 40,
    marginTop: 12, // Gap below clock
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
  private fullscreenMap: FullScreenMap;
  private leaderboard: Leaderboard;
  private soundManager: SoundManager;
  private assetManager: AssetManager;
  private wavePanel: WavePanel;
  private alivePlayersPanel: StatPanel;
  private totalPlayersPanel: StatPanel;
  private zombiesPanel: StatPanel;
  private killsPanel: StatPanel;
  private versionPanel: TextPanel;
  private fpsPanel: TextPanel;
  private pingPanel: TextPanel;
  private resourcesPanel: ResourcesPanel;

  constructor(mapManager: MapManager, soundManager: SoundManager, assetManager: AssetManager) {
    this.mapManager = mapManager;
    this.soundManager = soundManager;
    this.assetManager = assetManager;
    this.chatWidget = new ChatWidget();
    this.minimap = new Minimap(mapManager);
    this.fullscreenMap = new FullScreenMap(mapManager);
    this.leaderboard = new Leaderboard();

    // Initialize wave panel (top right)
    this.wavePanel = new WavePanel({
      padding: HUD_SETTINGS.Wave.padding,
      background: HUD_SETTINGS.Wave.background,
      borderColor: HUD_SETTINGS.Wave.borderColor,
      borderWidth: HUD_SETTINGS.Wave.borderWidth,
      width: HUD_SETTINGS.Wave.width,
      height: HUD_SETTINGS.Wave.height,
      font: HUD_SETTINGS.Wave.font,
      timerFont: HUD_SETTINGS.Wave.timerFont,
      x: 0, // Will be calculated in render
      y: 0, // Will be calculated in render
      textColor: HUD_SETTINGS.Wave.textColor,
      timerColor: HUD_SETTINGS.Wave.timerColor,
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
      text: getConfig().meta.VERSION,
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

    // Initialize resources panel (below clock)
    this.resourcesPanel = new ResourcesPanel(
      {
        padding: HUD_SETTINGS.Resources.padding,
        background: HUD_SETTINGS.Resources.background,
        borderColor: HUD_SETTINGS.Resources.borderColor,
        borderWidth: HUD_SETTINGS.Resources.borderWidth,
        x: 0,
        y: 0,
        font: HUD_SETTINGS.Resources.font,
        spriteSize: HUD_SETTINGS.Resources.spriteSize,
        iconGap: HUD_SETTINGS.Resources.iconGap,
        resourceGap: HUD_SETTINGS.Resources.resourceGap,
      },
      assetManager
    );
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

  public toggleFullscreenMap(): void {
    this.fullscreenMap.toggle();
  }

  public isFullscreenMapOpen(): boolean {
    return this.fullscreenMap.isOpen();
  }

  private getAlivePlayers(gameState: GameState): number {
    return gameState.entities.filter(
      (entity) =>
        entity instanceof PlayerClient && entity.hasExt(ClientDestructible) && !entity.isDead()
    ).length;
  }

  private getTotalPlayers(gameState: GameState): number {
    return gameState.entities.filter((entity) => entity instanceof PlayerClient).length;
  }

  private getAliveZombies(gameState: GameState): number {
    return gameState.entities.filter(
      (entity) =>
        Zombies.includes(entity.getType()) &&
        entity.hasExt(ClientDestructible) &&
        !entity.getExt(ClientDestructible).isDead()
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

    // Render wave panel in top right
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const waveX = width - HUD_SETTINGS.Wave.right - HUD_SETTINGS.Wave.width;
    const waveY = HUD_SETTINGS.Wave.top;
    // Update wave panel position
    (this.wavePanel as any).waveSettings.x = waveX;
    (this.wavePanel as any).waveSettings.y = waveY;
    this.wavePanel.render(ctx, gameState);
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

    this.renderGameMessages(ctx);
    this.renderMuteButton(ctx);
    this.leaderboard.render(ctx, gameState);
    this.chatWidget.render(ctx, gameState);

    // Render fullscreen map on top of everything else if open
    this.fullscreenMap.render(ctx, gameState);
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
    // Check fullscreen map clicks first (if open)
    if (this.fullscreenMap.handleClick(x, y)) {
      return true;
    }

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
