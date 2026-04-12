import { GameState, getEntityById } from "@/state";
import { getPlayer } from "@/util/get-player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { Minimap } from "./minimap";
import { FullScreenMap } from "./fullscreen-map";
import { Leaderboard } from "./leaderboard";
import { SoundManager } from "@/managers/sound-manager";
import { AssetManager } from "@/managers/asset";
import {
  TextPanel,
  DeathScreenPanel,
  GameMessagesPanel,
  MuteButtonPanel,
  CrateIndicatorsPanel,
  SurvivorIndicatorsPanel,
  ExperiencePanel,
} from "./panels";
import { getConfig } from "@shared/config";
import { scaleHudValue } from "@/util/hud-scale";
import { InventoryScreenUI, type InventoryUiTab } from "./inventory-screen";
import { SurvivorStatusHud } from "./survivor-status-hud";
import { LoadoutStrip } from "./loadout-strip";
import { InputManager } from "@/managers/input";
import { PlayerClient } from "@/entities/player";
import { InventoryItem, type EquipmentSlotKey } from "../../../game-shared/src/util/inventory";
import { ClientInventory } from "@/extensions/inventory";
import { renderRadialProgressIndicator } from "@/util/radial-progress-indicator";
import { getMinimapHudLayout } from "./minimap-hud-group-layout";
import {
  hitTestMinimapInventoryMenu,
  renderMinimapInventoryMenu,
} from "./minimap-inventory-menu";
import { QuestJournalPanel } from "./quest-journal-panel";
import { DialoguePanel } from "./dialogue-panel";
import {
  RPG_BODY_TEXT,
  RPG_BORDER_GOLD,
  RPG_HUD_PANEL_BG,
  RPG_PANEL_GRADIENT_TOP,
  RPG_TITLE_CREAM,
} from "./rpg-hud-theme";
import { ActiveQuestTrackerPanel } from "./active-quest-tracker-panel";

const HUD_SETTINGS = {
  GameMessages: {
    padding: 0,
    background: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    font: "24px Arial",
    textColor: RPG_BODY_TEXT,
    top: 120,
    gap: 40,
    messageTimeout: 5000,
  },
  DeathScreen: {
    padding: 0,
    background: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    font: "24px Arial",
    textColor: RPG_BODY_TEXT,
    overlayBackground: "rgba(0, 0, 0, 0.75)",
    panelBackground: RPG_PANEL_GRADIENT_TOP,
    text: "Press any key to respawn",
  },
  // Note: CrateIndicators, SurvivorIndicators, and HumanIndicators settings
  // are now loaded from getConfig().hud in the constructor
  BottomRightPanels: {
    right: 20,
    bottom: 20,
    gap: 8,
    padding: 8,
    background: RPG_HUD_PANEL_BG,
    borderColor: RPG_BORDER_GOLD,
    borderWidth: 2,
    font: "14px Arial",
    versionColor: RPG_TITLE_CREAM,
    fpsColor: RPG_BODY_TEXT,
    pingColors: {
      excellent: "rgb(0, 255, 0)", // Green: < 50ms
      good: "rgb(255, 255, 0)", // Yellow: 50-100ms
      fair: "rgb(255, 165, 0)", // Orange: 100-150ms
      poor: "rgb(255, 0, 0)", // Red: > 150ms
    },
  },
  Experience: {
    baseBarHeight: 10,
    baseLabelFontPx: 16,
  },
  MuteButton: {
    // Base values - scaled in MuteButtonPanel.updatePosition (button is bottom-left of screen)
    baseLeft: 300,
    baseBottom: 40,
    baseWidth: 40, // Reduced from 60
    baseHeight: 40, // Reduced from 60
    background: RPG_HUD_PANEL_BG,
    borderColor: RPG_BORDER_GOLD,
    borderWidth: 2,
    hoverBackground: "rgba(6, 8, 16, 0.98)",
    baseFont: 24, // Reduced from 36
  },
};

export class Hud {
  private showInstructions: boolean = false;
  private mapManager: MapManager;
  private chatWidget: ChatWidget;
  private currentFps: number = 0;
  private minimap: Minimap;
  private fullscreenMap: FullScreenMap;
  private leaderboard: Leaderboard;
  private soundManager: SoundManager;
  private assetManager: AssetManager;
  private versionPanel: TextPanel;
  private fpsPanel: TextPanel;
  private pingPanel: TextPanel;
  private deathScreenPanel: DeathScreenPanel;
  private gameMessagesPanel: GameMessagesPanel;
  private muteButtonPanel: MuteButtonPanel;
  private experiencePanel: ExperiencePanel;
  private crateIndicatorsPanel: CrateIndicatorsPanel;
  private survivorIndicatorsPanel: SurvivorIndicatorsPanel;
  private survivorStatusHud: SurvivorStatusHud;
  private loadoutStrip: LoadoutStrip;
  private inventoryScreen: InventoryScreenUI;
  private inputManager: InputManager;
  /** For HUD panels that need the local player entity (quests, loadout, etc.). */
  private getMyPlayer: () => PlayerClient | null;
  private currentGameState: GameState | null = null;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private canvasHeight: number = 0;
  private questJournalPanel: QuestJournalPanel;
  private dialoguePanel: DialoguePanel;
  private activeQuestTrackerPanel: ActiveQuestTrackerPanel;
  private onDialogueQuestChoice: ((action: "accept" | "decline") => void) | null = null;

  constructor(
    mapManager: MapManager,
    soundManager: SoundManager,
    assetManager: AssetManager,
    inputManager: InputManager,
    sendDropItem: (slotIndex: number) => void,
    sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void,
    sendSwapBagAndEquipment: (bagIndex: number, equipSlot: EquipmentSlotKey) => void,
    sendProgressionAllocations: (
      kind: "ability" | "character",
      allocations: Record<string, number>,
    ) => void,
    getMyPlayer: () => PlayerClient | null,
    sendSelectWeaponLoadout: (loadout: 0 | 1 | 2) => void,
    sendSetWeaponLoadoutSlot: (slot: 0 | 1 | 2, bagIndex: number) => void
  ) {
    this.mapManager = mapManager;
    this.soundManager = soundManager;
    this.assetManager = assetManager;
    this.inputManager = inputManager;
    this.getMyPlayer = getMyPlayer;
    this.chatWidget = new ChatWidget();
    this.questJournalPanel = new QuestJournalPanel();
    this.dialoguePanel = new DialoguePanel(this.assetManager);
    this.activeQuestTrackerPanel = new ActiveQuestTrackerPanel();

    // Create getInventory function for HUD that uses currentGameState
    const getInventory = (): (InventoryItem | null)[] => {
      if (!this.currentGameState || !this.currentGameState.playerId) {
        return [];
      }
      const entity = getEntityById(
        this.currentGameState,
        this.currentGameState.playerId
      );
      // Validate entity is a PlayerClient before accessing inventory
      if (entity && entity instanceof PlayerClient) {
        return entity.getInventory();
      }
      return [];
    };

    const getEquipment = () => {
      if (!this.currentGameState || !this.currentGameState.playerId) {
        return null;
      }
      const entity = getEntityById(this.currentGameState, this.currentGameState.playerId);
      if (entity instanceof PlayerClient && entity.hasExt(ClientInventory)) {
        return entity.getExt(ClientInventory).getEquipment();
      }
      return null;
    };

    this.survivorStatusHud = new SurvivorStatusHud();

    this.inventoryScreen = new InventoryScreenUI({
      assetManager: this.assetManager,
      inputManager: this.inputManager,
      getInventory,
      getEquipment,
      getMyPlayer: getMyPlayer,
      sendDropItem,
      sendSwapItems,
      sendSwapBagAndEquipment,
      sendSelectInventorySlot: (slotIndex) => {
        this.inputManager.setInventorySlot(slotIndex);
      },
      sendProgressionAllocations,
      sendSetWeaponLoadoutSlot,
      sendSelectWeaponLoadout,
      getAuthoredQuests: () => this.mapManager.getAuthoredQuests(),
    });

    this.loadoutStrip = new LoadoutStrip(
      this.assetManager,
      getInventory,
      getMyPlayer,
      sendSelectWeaponLoadout,
      (slot) => sendSetWeaponLoadoutSlot(slot, 0),
      () => this.inputManager.getCurrentInventorySlot(),
      (bagIndex) => this.inputManager.setInventorySlot(bagIndex),
    );

    this.minimap = new Minimap(mapManager);
    this.fullscreenMap = new FullScreenMap(mapManager);
    this.leaderboard = new Leaderboard();

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

    // Initialize death screen panel
    this.deathScreenPanel = new DeathScreenPanel({
      ...HUD_SETTINGS.DeathScreen,
    });

    // Initialize game messages panel
    this.gameMessagesPanel = new GameMessagesPanel({
      ...HUD_SETTINGS.GameMessages,
    });

    this.experiencePanel = new ExperiencePanel({
      padding: HUD_SETTINGS.BottomRightPanels.padding,
      background: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      baseBarHeight: HUD_SETTINGS.Experience.baseBarHeight,
      baseLabelFontPx: HUD_SETTINGS.Experience.baseLabelFontPx,
      getTotalExperience: () => {
        if (!this.currentGameState) {
          return 0;
        }
        const p = getPlayer(this.currentGameState);
        if (!p || !(p instanceof PlayerClient)) {
          return 0;
        }
        return p.getTotalExperience();
      },
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
      this.soundManager,
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

    // Initialize crate indicators panel (using config values)
    const hudCfg = getConfig().hud;
    this.crateIndicatorsPanel = new CrateIndicatorsPanel(
      {
        padding: 0,
        background: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        arrowSize: hudCfg.crateIndicators.arrowSize,
        arrowDistance: hudCfg.crateIndicators.arrowDistance,
        arrowColor: hudCfg.crateIndicators.arrowColor,
        crateSpriteSize: hudCfg.crateIndicators.spriteSize,
        minDistance: hudCfg.crateIndicators.minDistance,
      },
      this.assetManager
    );

    // Initialize survivor indicators panel (using config values)
    this.survivorIndicatorsPanel = new SurvivorIndicatorsPanel(
      {
        padding: 0,
        background: "transparent",
        borderColor: "transparent",
        borderWidth: 0,
        arrowSize: hudCfg.survivorIndicators.arrowSize,
        arrowDistance: hudCfg.survivorIndicators.arrowDistance,
        arrowColor: hudCfg.survivorIndicators.arrowColor,
        survivorSpriteSize: hudCfg.survivorIndicators.spriteSize,
        minDistance: hudCfg.survivorIndicators.minDistance,
      },
      this.assetManager
    );

  }

  public setRenderer(renderer: import("@/renderer").Renderer): void {
    this.minimap.setRenderer(renderer);
  }

  public update(gameState: GameState): void {
    this.currentGameState = gameState;
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

  public isDialogueLineFullyRevealed(gameState: GameState): boolean {
    return this.dialoguePanel.isCurrentLineFullyRevealed(gameState);
  }

  public completeDialogueLine(gameState: GameState): boolean {
    return this.dialoguePanel.completeCurrentLine(gameState);
  }

  public setDialogueQuestChoiceHandler(
    handler: ((action: "accept" | "decline") => void) | null,
  ): void {
    this.onDialogueQuestChoice = handler;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.currentGameState = gameState;
    const { width, height } = ctx.canvas;

    // Render indicators FIRST so they appear behind the panels that render after
    this.crateIndicatorsPanel.render(ctx, gameState);
    this.survivorIndicatorsPanel.render(ctx, gameState);

    const dialogueOcclusion = this.dialoguePanel.getOcclusionProgress();
    const minimapHudLayout = getMinimapHudLayout(width, height, {
      waveStackBottom: 0,
    });

    this.minimap.render(ctx, gameState, minimapHudLayout.minimap);
    const myPlayer = this.getMyPlayer();
    if (!this.questJournalPanel.isVisible()) {
      this.activeQuestTrackerPanel.render(
        ctx,
        this.mapManager.getAuthoredQuests(),
        myPlayer?.getQuestProgressPayload() ?? null,
        minimapHudLayout.minimap,
      );
    }

    // FPS, ping, version — bottom-right (row flows left from corner: version | ping | FPS)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const br = HUD_SETTINGS.BottomRightPanels;
    const marginRight = scaleHudValue(br.right, width, height);
    const marginBottom = scaleHudValue(br.bottom, width, height);
    const gap = scaleHudValue(br.gap, width, height);

    const player = getPlayer(gameState);
    const ping = player ? player.getPing() : 0;
    this.pingPanel.setText(`${Math.round(ping)}ms`);
    (this.pingPanel as any).textSettings.textColor = this.getPingColor(ping);

    const fpsW = this.fpsPanel.getWidth(ctx);
    const pingW = this.pingPanel.getWidth(ctx);
    const versionW = this.versionPanel.getWidth(ctx);
    const rowY = height - marginBottom - this.fpsPanel.getHeight();

    let x = width - marginRight - fpsW;
    (this.fpsPanel as any).textSettings.x = x;
    (this.fpsPanel as any).textSettings.y = rowY;
    this.fpsPanel.render(ctx, gameState);

    x -= gap + pingW;
    (this.pingPanel as any).textSettings.x = x;
    (this.pingPanel as any).textSettings.y = rowY;
    this.pingPanel.render(ctx, gameState);

    x -= gap + versionW;
    (this.versionPanel as any).textSettings.x = x;
    (this.versionPanel as any).textSettings.y = rowY;
    this.versionPanel.render(ctx, gameState);

    ctx.restore();

    if (dialogueOcclusion < 0.98) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - dialogueOcclusion * 1.2);
      this.loadoutStrip.render(ctx, gameState);
      ctx.restore();
    }

    // Render transient HUD messages (loot, craft, etc.)
    this.gameMessagesPanel.render(ctx, gameState);

    // Level + XP (centered above hotbar)
    if (dialogueOcclusion < 0.98) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - dialogueOcclusion * 1.25);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.experiencePanel.render(ctx, gameState);
      ctx.restore();
    }

    // Render mute button
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.muteButtonPanel.updatePosition(width, height);
    this.muteButtonPanel.render(ctx, gameState);
    ctx.restore();

    this.leaderboard.render(ctx, gameState);
    this.chatWidget.render(ctx, gameState);

    // Health + stamina orbs (left/right of bottom loadout strip)
    const currentPlayer = getPlayer(gameState);
    const isZombiePlayer = currentPlayer?.isZombiePlayer?.() ?? false;
    if (!isZombiePlayer && dialogueOcclusion < 0.98) {
      this.survivorStatusHud.renderHealthAndStamina(ctx, gameState, minimapHudLayout);
    }

    this.deathScreenPanel.render(ctx, gameState);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.questJournalPanel.render(
      ctx,
      this.mapManager.getAuthoredQuests(),
      myPlayer?.getQuestProgressPayload() ?? null,
    );
    ctx.restore();

    this.dialoguePanel.render(ctx, gameState);

    // Inventory tab shortcuts (minimap column): over NPC dialogue / chat scrim; panel draws after so it sits on top
    const playerForMenu = getPlayer(gameState);
    if (!(playerForMenu?.isZombiePlayer?.() ?? false)) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderMinimapInventoryMenu(ctx, minimapHudLayout.inventoryMenu, {
        panelOpen: this.inventoryScreen.isOpen(),
        activeTab: this.inventoryScreen.getActiveTab(),
      });
      ctx.restore();
    }

    if (!isZombiePlayer) {
      this.inventoryScreen.render(ctx, gameState);
    }

    // Render fullscreen map on top of everything else if open
    this.fullscreenMap.render(ctx, gameState);
  }

  public toggleQuestJournal(): void {
    this.questJournalPanel.toggle();
  }

  /**
   * Render pickup progress indicator above player's head
   */
  public renderPickupProgress(
    ctx: CanvasRenderingContext2D,
    playerPosition: { x: number; y: number },
    progress: number
  ): void {
    // Position above player's head (offset by player height + padding)
    const indicatorY = playerPosition.y - 20; // 16px player height + 4px padding
    const indicatorX = playerPosition.x + 8; // Center on player (player is 16px wide)

    renderRadialProgressIndicator(ctx, {
      progress,
      x: indicatorX,
      y: indicatorY,
      radius: 8,
      progressColor: "rgba(100, 255, 100, 0.9)", // Green for pickup
      borderColor: "rgba(255, 255, 255, 0.8)",
      borderWidth: 1.5,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      startAngle: -Math.PI / 2, // Start from top
    });
  }

  public addMessage(message: string, color?: string): void {
    this.gameMessagesPanel.addMessage(message, color);
  }

  public setShowPlayerList(show: boolean): void {
    this.leaderboard.setShow(show);
  }

  // Delegate chat methods to ChatWidget
  public toggleChatInput(): void {
    this.chatWidget.toggleChatInput();
  }

  public updateChatInput(key: string, shiftKey: boolean = false): void {
    this.chatWidget.updateChatInput(key, shiftKey);
  }

  public getChatInput(): string {
    return this.chatWidget.getChatInput();
  }

  public clearChatInput(): void {
    this.chatWidget.clearChatInput();
  }

  public addChatMessage(playerId: number, message: string): void {
    this.chatWidget.addChatMessage(playerId, message);
  }

  public saveChatMessage(message: string): void {
    this.chatWidget.saveChatMessage(message);
  }

  public isHoveringInventory(): boolean {
    if (this.inventoryScreen?.isOpen() && this.inventoryScreen.isHovering()) {
      return true;
    }
    return false;
  }

  public toggleInventoryScreen(): void {
    this.inventoryScreen.toggle();
  }

  public focusInventoryTab(tab: InventoryUiTab): void {
    this.inventoryScreen.focusTab(tab);
  }

  public getInventoryActiveTab(): InventoryUiTab {
    return this.inventoryScreen.getActiveTab();
  }

  public setInventoryScreenOpen(open: boolean): void {
    this.inventoryScreen.setOpen(open);
  }

  public isInventoryScreenOpen(): boolean {
    return this.inventoryScreen.isOpen();
  }

  /** When inventory is open, camera should center on the visible gameplay column (left of the panel). */
  public getInventoryCameraCenterScreenX(canvasWidth: number): number | null {
    return this.inventoryScreen.getCameraCenterScreenX(canvasWidth);
  }

  public isHoveringMuteButton(): boolean {
    return this.muteButtonPanel.isMouseOver(this.mouseX, this.mouseY, this.canvasHeight);
  }

  public handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1
  ): boolean {
    if (this.currentGameState) {
      const action = this.dialoguePanel.handleClick(x, y, this.currentGameState);
      if (action) {
        this.onDialogueQuestChoice?.(action);
        return true;
      }
    }
    if (this.inventoryScreen.isOpen()) {
      this.inventoryScreen.handleClick(x, y, canvasWidth, canvasHeight, clickCount);
      return true;
    }

    const my = this.getMyPlayer();
    if (!my?.isZombiePlayer?.()) {
      const layout = getMinimapHudLayout(canvasWidth, canvasHeight, { waveStackBottom: 0 });
      const tab = hitTestMinimapInventoryMenu(layout.inventoryMenu, x, y);
      if (tab) {
        this.inventoryScreen.focusTab(tab);
        return true;
      }
    }

    if (this.fullscreenMap.handleClick(x, y)) {
      return true;
    }

    if (this.loadoutStrip.handleClick(x, y, canvasWidth, canvasHeight, clickCount)) {
      return true;
    }

    // Check if click is on mute button
    if (this.muteButtonPanel.handleClick(x, y, canvasHeight)) {
      return true;
    }

    return false;
  }

  public handleMouseMove(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    if (this.inventoryScreen.isOpen()) {
      this.inventoryScreen.handleMouseMove(x, y, canvasWidth, canvasHeight);
    }

    if (this.fullscreenMap.isOpen()) {
      this.fullscreenMap.handleMouseMove(x, y);
    }
  }

  public handleMouseUp(x: number, y: number, canvasWidth: number, canvasHeight: number): void {
    if (this.inventoryScreen.isOpen()) {
      this.inventoryScreen.handleMouseUp(x, y, canvasWidth, canvasHeight);
    }

    if (this.fullscreenMap.isOpen()) {
      this.fullscreenMap.handleMouseUp();
    }
  }

  public updateMousePosition(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    this.mouseX = x;
    this.mouseY = y;
    this.canvasHeight = canvasHeight;
    this.dialoguePanel.updateMousePosition(x, y);

    if (this.inventoryScreen.isOpen()) {
      this.inventoryScreen.updateMousePosition(x, y, canvasWidth, canvasHeight);
    }
  }
}
