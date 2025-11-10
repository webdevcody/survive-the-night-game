import { GameState } from "@/state";
import { getPlayer } from "@/util/get-player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { Minimap } from "./minimap";
import { FullScreenMap } from "./fullscreen-map";
import { Leaderboard } from "./leaderboard";
import { SoundManager } from "@/managers/sound-manager";
import { AssetManager } from "@/managers/asset";
import {
  WavePanel,
  TextPanel,
  ResourcesPanel,
  CarHealthPanel,
  DeathScreenPanel,
  GameMessagesPanel,
  MuteButtonPanel,
  CrateIndicatorsPanel,
} from "./panels";
import { getConfig } from "@shared/config";
import { scaleHudValue, calculateHudScale } from "@/util/hud-scale";

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
    font: "14px Arial",
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
    // Base values - will be scaled dynamically
    baseLeft: 300, // Position to the right of minimap (40 + 240 + 20)
    baseBottom: 40, // Same bottom position as minimap
    baseWidth: 40, // Reduced from 60
    baseHeight: 40, // Reduced from 60
    background: "rgba(0, 0, 0, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
    hoverBackground: "rgba(0, 0, 0, 0.9)",
    baseFont: 24, // Reduced from 36
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
    font: "20px Arial",
    spriteSize: 32,
    iconGap: 12,
    resourceGap: 8,
    right: 40,
    marginTop: 2, // Gap below clock
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
    // y position is now calculated dynamically in render() to center vertically more
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
      y: 0, // Not used anymore, calculated dynamically
    });

    // Initialize death screen panel
    this.deathScreenPanel = new DeathScreenPanel({
      ...HUD_SETTINGS.DeathScreen,
    });

    // Initialize game messages panel
    this.gameMessagesPanel = new GameMessagesPanel({
      ...HUD_SETTINGS.GameMessages,
    });

    // Initialize mute button panel (will be positioned dynamically in render)
    this.muteButtonPanel = new MuteButtonPanel(
      {
        padding: HUD_SETTINGS.BottomRightPanels.padding,
        background: HUD_SETTINGS.MuteButton.background,
        borderColor: HUD_SETTINGS.MuteButton.borderColor,
        borderWidth: HUD_SETTINGS.MuteButton.borderWidth,
        left: 0, // Will be set dynamically
        bottom: 0, // Will be set dynamically
        width: 0, // Will be set dynamically
        height: 0, // Will be set dynamically
        font: `${HUD_SETTINGS.MuteButton.baseFont}px Arial`, // Will be scaled dynamically
        hoverBackground: HUD_SETTINGS.MuteButton.hoverBackground,
      },
      soundManager,
      {
        baseWidth: HUD_SETTINGS.MuteButton.baseWidth,
        baseHeight: HUD_SETTINGS.MuteButton.baseHeight,
        baseFont: HUD_SETTINGS.MuteButton.baseFont,
        background: HUD_SETTINGS.MuteButton.background,
        borderColor: HUD_SETTINGS.MuteButton.borderColor,
        borderWidth: HUD_SETTINGS.MuteButton.borderWidth,
        hoverBackground: HUD_SETTINGS.MuteButton.hoverBackground,
      }
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

    // Calculate scaled minimap values once for reuse
    const minimapSize = scaleHudValue(240, width, height); // MINIMAP_SETTINGS.size (reduced from 280, was 400 originally)
    const minimapRight = scaleHudValue(40, width, height); // MINIMAP_SETTINGS.right
    const minimapBottom = scaleHudValue(40, width, height); // MINIMAP_SETTINGS.bottom
    const minimapLeft = width - minimapRight - minimapSize; // Calculate from right side

    // Render crate indicators first (so they appear behind other UI)
    this.crateIndicatorsPanel.render(ctx, gameState);

    // Render minimap first
    this.minimap.render(ctx, gameState);

    // Render car health panel at top center (it positions itself)
    this.carHealthPanel.render(ctx, gameState);

    // Calculate wave panel position once for reuse
    const waveScale = calculateHudScale(width, height);
    const scaledWaveWidth = HUD_SETTINGS.Wave.width * waveScale;
    const scaledWaveHeight = HUD_SETTINGS.Wave.height * waveScale;
    const scaledWaveRight = scaleHudValue(HUD_SETTINGS.Wave.right, width, height);
    const carHealthTopMargin = scaleHudValue(20, width, height);
    const waveX = width - scaledWaveRight - scaledWaveWidth;
    const waveY = carHealthTopMargin; // Same Y position as car health panel

    // Render resources panel (right side, vertically centered) with scaled dimensions
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const resourcesSettings = HUD_SETTINGS.Resources;
    const resourcesScale = calculateHudScale(width, height);
    // Calculate panel dimensions for positioning
    const scaledSpriteSize = resourcesSettings.spriteSize * resourcesScale;
    const scaledResourceGap = resourcesSettings.resourceGap * resourcesScale;
    const scaledPadding = resourcesSettings.padding * resourcesScale;
    const scaledIconGap = resourcesSettings.iconGap * resourcesScale;
    // Estimate panel width (sprite + gap + text width estimate)
    const estimatedTextWidth = scaleHudValue(40, width, height); // Approximate text width
    const maxContentWidth = scaledSpriteSize + scaledIconGap + estimatedTextWidth;
    const resourcesPanelWidth = maxContentWidth + scaledPadding * 2;
    const resourcesPanelHeight = scaledSpriteSize * 3 + scaledResourceGap * 2 + scaledPadding * 2;
    // Position resources panel on the right side of screen
    const scaledResourcesRight = scaleHudValue(0, width, height); // 20px from right edge
    const scaledResourcesX = width - scaledResourcesRight - resourcesPanelWidth;
    // Center vertically
    const scaledResourcesY = (height - resourcesPanelHeight) / 3;
    (this.resourcesPanel as any).resourcesSettings.x = scaledResourcesX;
    (this.resourcesPanel as any).resourcesSettings.y = scaledResourcesY;
    // Scale font and sprite size
    const resourcesBaseFontSize = parseInt(resourcesSettings.font);
    (this.resourcesPanel as any).resourcesSettings.font = `${
      resourcesBaseFontSize * resourcesScale
    }px Arial`;
    (this.resourcesPanel as any).resourcesSettings.spriteSize =
      resourcesSettings.spriteSize * resourcesScale;
    (this.resourcesPanel as any).resourcesSettings.iconGap =
      resourcesSettings.iconGap * resourcesScale;
    (this.resourcesPanel as any).resourcesSettings.resourceGap =
      resourcesSettings.resourceGap * resourcesScale;
    (this.resourcesPanel as any).settings.padding = resourcesSettings.padding * resourcesScale;
    (this.resourcesPanel as any).settings.borderWidth =
      resourcesSettings.borderWidth * resourcesScale;
    this.resourcesPanel.render(ctx, gameState);
    ctx.restore();

    // Render wave panel in top right with scaled dimensions, aligned with car health panel
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Update wave panel position and size
    (this.wavePanel as any).waveSettings.x = waveX;
    (this.wavePanel as any).waveSettings.y = waveY;
    (this.wavePanel as any).waveSettings.width = scaledWaveWidth;
    (this.wavePanel as any).waveSettings.height = scaledWaveHeight;
    // Scale fonts
    const baseFontSize = parseInt(HUD_SETTINGS.Wave.font);
    const baseTimerFontSize = parseInt(HUD_SETTINGS.Wave.timerFont.match(/\d+/)?.[0] || "36");
    (this.wavePanel as any).waveSettings.font = `${baseFontSize * waveScale}px Arial`;
    (this.wavePanel as any).waveSettings.timerFont = `bold ${
      baseTimerFontSize * waveScale
    }px monospace`;
    // Scale border width
    (this.wavePanel as any).settings.borderWidth = HUD_SETTINGS.Wave.borderWidth * waveScale;
    this.wavePanel.render(ctx, gameState);
    ctx.restore();

    // Render top panels (FPS, ping, version) at top-left, to the right of config button
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const topPanelsSettings = HUD_SETTINGS.BottomRightPanels;
    // Menu buttons are at left-4 top-4 (16px), each button is ~40px wide with 8px gap
    // Config button is the rightmost button, so account for all menu buttons + config button
    const menuButtonsWidth = scaleHudValue(250, width, height); // Approximate width for all menu buttons including config
    const startX =
      scaleHudValue(16, width, height) + menuButtonsWidth + scaleHudValue(16, width, height); // 16px left + buttons + larger gap
    const topY = scaleHudValue(16, width, height); // Align with top-4 (16px)
    let currentX = startX;

    // Render FPS panel (leftmost)
    (this.fpsPanel as any).textSettings.x = currentX;
    (this.fpsPanel as any).textSettings.y = topY;
    this.fpsPanel.render(ctx, gameState);
    currentX += this.fpsPanel.getWidth(ctx) + topPanelsSettings.gap;

    // Render ping panel (middle)
    (this.pingPanel as any).textSettings.x = currentX;
    (this.pingPanel as any).textSettings.y = topY;
    this.pingPanel.render(ctx, gameState);
    currentX += this.pingPanel.getWidth(ctx) + topPanelsSettings.gap;

    // Render version panel (rightmost)
    (this.versionPanel as any).textSettings.x = currentX;
    (this.versionPanel as any).textSettings.y = topY;
    this.versionPanel.render(ctx, gameState);

    ctx.restore();

    // Render game messages (player joined/died)
    this.gameMessagesPanel.render(ctx, gameState);

    // Render mute button
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.muteButtonPanel.updatePosition(width, height);
    this.muteButtonPanel.render(ctx, gameState);
    ctx.restore();

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
