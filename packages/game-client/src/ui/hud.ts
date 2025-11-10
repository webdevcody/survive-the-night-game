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
import {
  WavePanel,
  StatPanel,
  TextPanel,
  ResourcesPanel,
  CarHealthPanel,
  DeathScreenPanel,
  GameMessagesPanel,
  MuteButtonPanel,
  CrateIndicatorsPanel,
} from "./panels";
import { getConfig } from "@shared/config";

const HUD_SETTINGS = {
  GameMessages: {
    padding: 0,
    background: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    font: "32px Arial",
    textColor: "white",
    top: 120,
    gap: 40,
    messageTimeout: 5000,
  },
  DeathScreen: {
    padding: 0,
    background: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    font: "48px Arial",
    textColor: "black",
    overlayBackground: "rgba(0, 0, 0, 0.7)",
    panelBackground: "white",
    text: "Press any key to respawn",
  },
  CrateIndicators: {
    padding: 0,
    background: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    arrowSize: 30,
    arrowDistance: 60,
    arrowColor: "rgba(255, 50, 50, 0.9)",
    crateSpriteSize: 32,
    minDistance: 100,
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
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
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
  private carHealthPanel: CarHealthPanel;
  private deathScreenPanel: DeathScreenPanel;
  private gameMessagesPanel: GameMessagesPanel;
  private muteButtonPanel: MuteButtonPanel;
  private crateIndicatorsPanel: CrateIndicatorsPanel;

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

    // Initialize car health panel (center top of screen)
    this.carHealthPanel = new CarHealthPanel({
      padding: 8,
      background: "rgba(0, 0, 0, 0.85)",
      borderColor: "rgba(255, 50, 50, 0.8)",
      borderWidth: 3,
      width: 200,
      height: 16,
      iconSize: 28,
      iconGap: 8,
      font: "24px Arial",
      barBackgroundColor: "rgba(100, 0, 0, 0.5)",
      barColor: "rgba(255, 50, 50, 1)",
      y: 20,
    });

    // Initialize death screen panel
    this.deathScreenPanel = new DeathScreenPanel({
      ...HUD_SETTINGS.DeathScreen,
    });

    // Initialize game messages panel
    this.gameMessagesPanel = new GameMessagesPanel({
      ...HUD_SETTINGS.GameMessages,
    });

    // Initialize mute button panel
    this.muteButtonPanel = new MuteButtonPanel(
      {
        padding: HUD_SETTINGS.BottomRightPanels.padding,
        background: HUD_SETTINGS.MuteButton.background,
        borderColor: HUD_SETTINGS.MuteButton.borderColor,
        borderWidth: HUD_SETTINGS.MuteButton.borderWidth,
        left: HUD_SETTINGS.MuteButton.left,
        bottom: HUD_SETTINGS.MuteButton.bottom,
        width: HUD_SETTINGS.MuteButton.width,
        height: HUD_SETTINGS.MuteButton.height,
        font: HUD_SETTINGS.MuteButton.font,
        hoverBackground: HUD_SETTINGS.MuteButton.hoverBackground,
      },
      soundManager
    );

    // Initialize crate indicators panel
    this.crateIndicatorsPanel = new CrateIndicatorsPanel(
      {
        ...HUD_SETTINGS.CrateIndicators,
      },
      assetManager
    );
  }

  public update(gameState: GameState): void {
    this.gameMessagesPanel.update();
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

    // Render crate indicators first (so they appear behind other UI)
    this.crateIndicatorsPanel.render(ctx, gameState);

    // Render minimap first
    this.minimap.render(ctx, gameState);

    // Render car health panel at top center (it positions itself)
    this.carHealthPanel.render(ctx, gameState);

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

    // Render game messages (player joined/died)
    this.gameMessagesPanel.render(ctx, gameState);

    // Render mute button
    this.muteButtonPanel.render(ctx, gameState);

    this.leaderboard.render(ctx, gameState);
    this.chatWidget.render(ctx, gameState);

    // Render death screen if player is dead
    this.deathScreenPanel.render(ctx, gameState);

    // Render fullscreen map on top of everything else if open
    this.fullscreenMap.render(ctx, gameState);
  }

  public addMessage(message: string, color?: string): void {
    this.gameMessagesPanel.addMessage(message, color);
  }

  public showPlayerDeath(playerId: string): void {
    this.addMessage(`${playerId} has died`, "red");
  }

  public showPlayerJoined(displayName: string): void {
    this.addMessage(`${displayName} has joined the game`, "white");
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
    if (this.muteButtonPanel.handleClick(x, y, canvasHeight)) {
      return true;
    }

    return false; // Click was not handled
  }
}
