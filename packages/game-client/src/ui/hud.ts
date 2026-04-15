import { GameState, getEntityById } from "@/state";
import { getPlayer } from "@/util/get-player";
import { MapManager } from "@/managers/map";
import { ChatWidget } from "./chat-widget";
import { Minimap } from "./minimap";
import { FullScreenMap } from "./fullscreen-map";
import { SoundManager } from "@/managers/sound-manager";
import { AssetManager } from "@/managers/asset";
import {
  TextPanel,
  DeathScreenPanel,
  GameMessagesPanel,
  MuteButtonPanel,
  PlayersOnlinePanel,
  ExitGameButtonPanel,
  CrateIndicatorsPanel,
  SurvivorIndicatorsPanel,
  QuestIndicatorsPanel,
  ExperiencePanel,
} from "./panels";
import { getConfig } from "@shared/config";
import { MAX_RANK_PER_ABILITY } from "@shared/util/ability-tree";
import { scaleHudValue } from "@/util/hud-scale";
import { InventoryScreenUI, type InventoryUiTab } from "./inventory-screen";
import { SurvivorStatusHud } from "./survivor-status-hud";
import { LoadoutStrip, getLoadoutStripScreenLayout } from "./loadout-strip";
import { InputManager } from "@/managers/input";
import { PlayerClient } from "@/entities/player";
import { InventoryItem, type EquipmentSlotKey } from "../../../game-shared/src/util/inventory";
import { ClientInventory } from "@/extensions/inventory";
import { ClientBank } from "@/extensions/bank";
import type { BankActionEventData } from "@shared/events/client-sent/events/bank-action";
import type { AuctionActionEventData } from "../../../game-shared/src/events/client-sent/events/auction-action";
import type { SetSignTextEventData } from "@shared/events/client-sent/events/set-sign-text";
import type { SplitInventoryStackEventData } from "@shared/events/client-sent/events/split-inventory-stack";
import type { AuctionHouseSnapshotPayload } from "../../../game-shared/src/util/auction-types";
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
  RPG_COUNTER_GOLD,
  RPG_HUD_PANEL_BG,
  RPG_METADATA_MUTED,
  RPG_PANEL_GRADIENT_TOP,
  RPG_TITLE_CREAM,
} from "./rpg-hud-theme";
import { ActiveQuestTrackerPanel } from "./active-quest-tracker-panel";
import { SignReadModal } from "./sign-modals";

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
  PlayersOnline: {
    baseFontPx: 14,
    baseGapFromMute: 8,
    basePadX: 10,
    background: RPG_HUD_PANEL_BG,
    borderColor: RPG_BORDER_GOLD,
    borderWidth: 2,
    textColor: RPG_TITLE_CREAM,
  },
  ExitGameButton: {
    baseLeft: 16,
    baseTop: 16,
    baseWidth: 88,
    baseHeight: 40,
    baseFont: 16,
    background: RPG_HUD_PANEL_BG,
    borderColor: RPG_BORDER_GOLD,
    borderWidth: 2,
  },
};

export interface HudOptions {
  mapManager: MapManager;
  soundManager: SoundManager;
  assetManager: AssetManager;
  inputManager: InputManager;
  getMyPlayer: () => PlayerClient | null;
  sendDropItem: (slotIndex: number, amount?: number) => void;
  sendSwapItems: (fromSlotIndex: number, toSlotIndex: number) => void;
  sendSwapBagAndEquipment: (bagIndex: number, equipSlot: EquipmentSlotKey) => void;
  sendProgressionAllocations: (kind: "ability" | "character", allocations: Record<string, number>) => void;
  sendSelectWeaponLoadout: (loadout: 0 | 1 | 2) => void;
  sendSetWeaponLoadoutSlot: (slot: 0 | 1 | 2 | 3 | 4, bagIndex: number) => void;
  sendBankAction: (data: BankActionEventData) => void;
  sendAuctionAction: (data: AuctionActionEventData) => void;
  sendSplitInventoryStack: (data: SplitInventoryStackEventData) => void;
  sendSetSignText: (data: SetSignTextEventData) => void;
  sendConsumeItem: (itemType: string | null, slotIndex?: number) => void;
  sendDropFromEquipment: (equipSlot: EquipmentSlotKey) => void;
  sendInteract: (targetEntityId: number) => void;
  sendMerchantBuy: (merchantId: number, itemIndex: number) => void;
  sendMerchantSell: (merchantId: number, inventorySlot: number) => void;
  getCanvas: () => HTMLCanvasElement;
  onRequestExitGame?: () => void;
}

export class Hud {
  private mapManager: MapManager;
  private chatWidget: ChatWidget;
  private currentFps: number = 0;
  private minimap: Minimap;
  private fullscreenMap: FullScreenMap;
  private soundManager: SoundManager;
  private assetManager: AssetManager;
  private versionPanel: TextPanel;
  private fpsPanel: TextPanel;
  private pingPanel: TextPanel;
  private deathScreenPanel: DeathScreenPanel;
  private gameMessagesPanel: GameMessagesPanel;
  private muteButtonPanel: MuteButtonPanel;
  private playersOnlinePanel: PlayersOnlinePanel;
  private exitGameButtonPanel: ExitGameButtonPanel | null = null;
  private experiencePanel: ExperiencePanel;
  private crateIndicatorsPanel: CrateIndicatorsPanel;
  private survivorIndicatorsPanel: SurvivorIndicatorsPanel;
  private questIndicatorsPanel: QuestIndicatorsPanel;
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
  private auctionSnapshot: AuctionHouseSnapshotPayload | null = null;
  private signReadModal: SignReadModal | null = null;
  private sendInteract: (targetEntityId: number) => void;

  constructor(options: HudOptions) {
    this.mapManager = options.mapManager;
    this.soundManager = options.soundManager;
    this.assetManager = options.assetManager;
    this.inputManager = options.inputManager;
    this.getMyPlayer = options.getMyPlayer;
    this.sendInteract = options.sendInteract;
    const {
      sendDropItem,
      sendSwapItems,
      sendSwapBagAndEquipment,
      sendProgressionAllocations,
      sendSelectWeaponLoadout,
      sendSetWeaponLoadoutSlot,
      sendBankAction,
      sendSplitInventoryStack,
      sendSetSignText,
      sendConsumeItem,
      sendDropFromEquipment,
      onRequestExitGame,
    } = options;
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

    const getBank = (): (InventoryItem | null)[] => {
      if (!this.currentGameState || !this.currentGameState.playerId) {
        return [];
      }
      const entity = getEntityById(this.currentGameState, this.currentGameState.playerId);
      if (entity instanceof PlayerClient && entity.hasExt(ClientBank)) {
        return entity.getExt(ClientBank).getItems();
      }
      return [];
    };

    this.survivorStatusHud = new SurvivorStatusHud();

    this.inventoryScreen = new InventoryScreenUI({
      assetManager: this.assetManager,
      inputManager: this.inputManager,
      getInventory,
      getEquipment,
      getBank,
      getMyPlayer: this.getMyPlayer,
      sendDropItem,
      sendSwapItems,
      sendSwapBagAndEquipment,
      sendProgressionAllocations,
      sendSetWeaponLoadoutSlot,
      sendSelectWeaponLoadout,
      sendBankAction,
      sendSetSignText,
      sendConsumeItem,
      sendDropFromEquipment,
      sendSplitInventoryStack,
      getAuthoredQuests: () => this.mapManager.getAuthoredQuests(),
      sendAuctionAction: options.sendAuctionAction,
      getAuctionSnapshot: () => this.auctionSnapshot,
      sendMerchantBuy: options.sendMerchantBuy,
      sendMerchantSell: options.sendMerchantSell,
      getCanvas: options.getCanvas,
    });

    this.loadoutStrip = new LoadoutStrip(
      this.assetManager,
      getInventory,
      this.getMyPlayer,
      sendSelectWeaponLoadout,
      (slot) => sendSetWeaponLoadoutSlot(slot, 0),
    );

    this.minimap = new Minimap(this.mapManager);
    this.fullscreenMap = new FullScreenMap(this.mapManager);

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

    const po = HUD_SETTINGS.PlayersOnline;
    this.playersOnlinePanel = new PlayersOnlinePanel({
      padding: HUD_SETTINGS.BottomRightPanels.padding,
      background: po.background,
      borderColor: po.borderColor,
      borderWidth: po.borderWidth,
      textColor: po.textColor,
      baseFontPx: po.baseFontPx,
      baseGapFromMute: po.baseGapFromMute,
      basePadX: po.basePadX,
    });

    if (onRequestExitGame) {
      const eg = HUD_SETTINGS.ExitGameButton;
      this.exitGameButtonPanel = new ExitGameButtonPanel(
        {
          padding: HUD_SETTINGS.BottomRightPanels.padding,
          background: eg.background,
          borderColor: eg.borderColor,
          borderWidth: eg.borderWidth,
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          font: `${eg.baseFont}px Arial`,
        },
        {
          baseLeft: eg.baseLeft,
          baseTop: eg.baseTop,
          baseWidth: eg.baseWidth,
          baseHeight: eg.baseHeight,
          baseFont: eg.baseFont,
          background: eg.background,
          borderColor: eg.borderColor,
          borderWidth: eg.borderWidth,
        },
        onRequestExitGame
      );
    }

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

    this.questIndicatorsPanel = new QuestIndicatorsPanel({
      padding: 0,
      background: "transparent",
      borderColor: "transparent",
      borderWidth: 0,
      arrowSize: hudCfg.questNavigationIndicators.arrowSize,
      arrowDistance: hudCfg.questNavigationIndicators.arrowDistance,
      arrowColor: hudCfg.questNavigationIndicators.arrowColor,
      minDistance: hudCfg.questNavigationIndicators.minDistance,
    });
  }

  public setRenderer(renderer: import("@/renderer").Renderer): void {
    this.minimap.setRenderer(renderer);
  }

  public update(gameState: GameState): void {
    this.currentGameState = gameState;
    this.gameMessagesPanel.update();
    this.chatWidget.update();
  }

  /** Run once per frame before camera + input (see InventoryScreenUI.tickPanelAnimations). */
  public tickPanelAnimations(now: number): void {
    this.inventoryScreen.tickPanelAnimations(now);
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

  /** Draws clip / reserve above the hotbar; returns right edge of the text, or null if hidden. */
  private renderAmmoCounter(
    ctx: CanvasRenderingContext2D,
    player: PlayerClient,
    centerX: number,
    canvasWidth: number,
    canvasHeight: number,
  ): number | null {
    const ammoState = player.getActiveWeaponAmmoState();
    if (!ammoState) {
      return null;
    }

    const layout = getLoadoutStripScreenLayout(canvasWidth, canvasHeight, centerX);
    const clipLabel = `${ammoState.clip}`;
    const reserveLabel = ` / ${ammoState.reserve}`;
    const clipFont = `bold ${Math.max(20, Math.round(24 * layout.scale))}px Arial`;
    const reserveFont = `bold ${Math.max(12, Math.round(15 * layout.scale))}px Arial`;
    const baseX = layout.x + 2 * layout.scale;
    const baseY = layout.y - 8 * layout.scale;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = "rgba(6, 8, 16, 0.95)";
    ctx.lineWidth = Math.max(2, Math.round(3 * layout.scale));

    ctx.font = clipFont;
    ctx.fillStyle = player.isReloadingWeapon() ? RPG_COUNTER_GOLD : RPG_TITLE_CREAM;
    ctx.strokeText(clipLabel, baseX, baseY);
    ctx.fillText(clipLabel, baseX, baseY);
    const clipWidth = ctx.measureText(clipLabel).width;

    ctx.font = reserveFont;
    ctx.fillStyle = RPG_METADATA_MUTED;
    const reserveX = baseX + clipWidth;
    ctx.strokeText(reserveLabel, reserveX, baseY);
    ctx.fillText(reserveLabel, reserveX, baseY);

    const reserveWidth = ctx.measureText(reserveLabel).width;
    const rightEdge = reserveX + reserveWidth;
    ctx.restore();
    return rightEdge;
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.currentGameState = gameState;
    const { width, height } = ctx.canvas;
    const hotbarCenterX = this.inventoryScreen.getCameraCenterScreenX(width) ?? width / 2;

    // Render indicators FIRST so they appear behind the panels that render after
    this.crateIndicatorsPanel.render(ctx, gameState);
    this.survivorIndicatorsPanel.render(ctx, gameState);
    this.questIndicatorsPanel.render(ctx, gameState);

    if (this.exitGameButtonPanel) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.exitGameButtonPanel.updatePosition(width, height);
      this.exitGameButtonPanel.render(ctx, gameState);
      ctx.restore();
    }

    const dialogueOcclusion = this.dialoguePanel.getOcclusionProgress();
    const minimapHudLayout = getMinimapHudLayout(width, height, {
      waveStackBottom: 0,
      hotbarCenterX,
    });

    this.minimap.render(ctx, gameState, minimapHudLayout.minimap);
    const myPlayer = this.getMyPlayer();
    const isZombiePlayer = myPlayer?.isZombiePlayer?.() ?? false;
    if (!this.questJournalPanel.isVisible()) {
      this.activeQuestTrackerPanel.render(
        ctx,
        this.mapManager.getAuthoredQuests(),
        myPlayer?.getQuestProgressPayload() ?? null,
        minimapHudLayout.minimap,
        gameState,
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
      this.loadoutStrip.render(ctx, gameState, hotbarCenterX);
      ctx.restore();
    }

    // Render transient HUD messages (loot, craft, etc.)
    this.gameMessagesPanel.render(ctx, gameState);

    // Ammo (left above hotbar) then XP bar to its right
    if (dialogueOcclusion < 0.98) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - dialogueOcclusion * 1.25);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const stripLayout = getLoadoutStripScreenLayout(width, height, hotbarCenterX);
      let xpBarLeftPx = stripLayout.x + 2 * stripLayout.scale;
      if (!isZombiePlayer && myPlayer) {
        const ammoRight = this.renderAmmoCounter(ctx, myPlayer, hotbarCenterX, width, height);
        if (ammoRight !== null) {
          xpBarLeftPx = ammoRight + 8 * stripLayout.scale;
        }
      }
      this.experiencePanel.render(ctx, gameState, hotbarCenterX, xpBarLeftPx);
      ctx.restore();
    }

    // Render mute button
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.muteButtonPanel.updatePosition(width, height);
    this.playersOnlinePanel.updatePosition(width, height, this.muteButtonPanel.getLayout());
    this.muteButtonPanel.render(ctx, gameState);
    this.playersOnlinePanel.render(ctx, gameState);
    ctx.restore();

    this.chatWidget.render(ctx, gameState);

    // Health + stamina orbs (left/right of bottom loadout strip)
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
      gameState,
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
        showCharacterUnspentBadge:
          playerForMenu != null && playerForMenu.getAvailableCharacterPoints() > 0,
        showAbilitiesUnspentBadge:
          playerForMenu != null &&
          playerForMenu.getAvailableAbilityPoints() > 0 &&
          (playerForMenu.getAbilitySprintRank() < MAX_RANK_PER_ABILITY ||
            playerForMenu.getAbilityRegenerateRank() < MAX_RANK_PER_ABILITY),
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

  public openBank(lockerEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.inventoryScreen.openBank(lockerEntityId, inventoryWasAlreadyOpen);
  }

  public openAuction(auctionHouseEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.inventoryScreen.openAuction(auctionHouseEntityId, inventoryWasAlreadyOpen);
  }

  public openMerchant(merchantEntityId: number, inventoryWasAlreadyOpen: boolean): void {
    this.inventoryScreen.openMerchant(merchantEntityId, inventoryWasAlreadyOpen);
  }

  /** Latest auction house snapshot from server (for inventory UI). */
  public applyAuctionSnapshot(snapshot: AuctionHouseSnapshotPayload): void {
    this.auctionSnapshot = snapshot;
  }

  public closeBank(): void {
    this.inventoryScreen.closeBank();
  }

  public isBankOpen(): boolean {
    return this.inventoryScreen.isBankOpen();
  }

  public shouldCloseFullInventoryWhenTogglingBank(): boolean {
    return this.inventoryScreen.shouldCloseFullInventoryWhenTogglingBank();
  }

  public handleInventoryContextClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
  ): boolean {
    return this.inventoryScreen.handleRightClick(x, y, canvasWidth, canvasHeight);
  }

  public isInventoryScreenOpen(): boolean {
    return this.inventoryScreen.isOpen();
  }

  public isBlockingModalOpen(): boolean {
    return this.signReadModal !== null || this.inventoryScreen.isBlockingModalOpen();
  }

  public isSignReadModalOpen(): boolean {
    return this.signReadModal !== null && this.signReadModal.isOpen();
  }

  public closeSignReadModal(): void {
    this.signReadModal?.close();
    this.signReadModal = null;
  }

  public openSignReadModal(message: string, signEntityId: number): void {
    this.signReadModal?.close();
    this.signReadModal = new SignReadModal(
      {
        title: "Sign",
        message,
        onPickUp: () => {
          this.sendInteract(signEntityId);
        },
      },
      () => {
        this.signReadModal = null;
      },
    );
    this.signReadModal.open();
  }

  /** When inventory is open, camera should center on the visible gameplay column (left of the panel). */
  public getInventoryCameraCenterScreenX(canvasWidth: number): number | null {
    return this.inventoryScreen.getCameraCenterScreenX(canvasWidth);
  }

  public isHoveringMuteButton(): boolean {
    return this.muteButtonPanel.isMouseOver(this.mouseX, this.mouseY, this.canvasHeight);
  }

  public isHoveringExitGameButton(): boolean {
    if (!this.exitGameButtonPanel) {
      return false;
    }
    return this.exitGameButtonPanel.isMouseOver(this.mouseX, this.mouseY);
  }

  public handleClick(
    x: number,
    y: number,
    canvasWidth: number,
    canvasHeight: number,
    clickCount: number = 1,
  ): boolean {
    if (this.exitGameButtonPanel?.handleClick(x, y)) {
      return true;
    }
    if (this.chatWidget.handleToggleButtonClick(x, y, canvasHeight)) {
      return true;
    }
    if (this.currentGameState) {
      const action = this.dialoguePanel.handleClick(x, y, this.currentGameState);
      if (action) {
        this.onDialogueQuestChoice?.(action);
        return true;
      }
    }
    const hotbarCenterX = this.inventoryScreen.getCameraCenterScreenX(canvasWidth) ?? canvasWidth / 2;
    if (this.inventoryScreen.isOpen()) {
      if (this.inventoryScreen.handleClick(x, y, canvasWidth, canvasHeight, clickCount)) {
        return true;
      }
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

    if (this.loadoutStrip.handleClick(x, y, canvasWidth, canvasHeight, clickCount, hotbarCenterX)) {
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
