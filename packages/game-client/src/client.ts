import { AssetManager, ImageLoader } from "@/managers/asset";
import { InputManager } from "@/managers/input";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { PlayerClient } from "@/entities/player";
import { CameraManager } from "@/managers/camera";
import { MapManager } from "@/managers/map";
import {
  GameState,
  getEntityById,
  getEntitiesByType,
  removeEntity as removeEntityFromState,
} from "@/state";
import { MerchantBuyPanel } from "@/ui/merchant-buy-panel";
import { CraftingPanel } from "@/ui/crafting-panel";
import { StorageManager } from "@/managers/storage";
import { Hud } from "@/ui/hud";
import { EntityFactory } from "@/entities/entity-factory";
import { Renderer } from "@/renderer";
import { ZoomController } from "@/zoom-controller";
import { ResizeController } from "@/resize-controller";
import { ClientEventListener } from "@/client-event-listener";
import { SoundManager, SOUND_TYPES_TO_MP3, type SoundType } from "@/managers/sound-manager";
import { Direction } from "../../game-shared/src/util/direction";
import { Input } from "../../game-shared/src/util/input";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientDestructible } from "@/extensions/destructible";
import {
  ClientPositionable,
  ClientInventory,
  ClientPlaceable,
  ClientInteractive,
} from "@/extensions";
import { ParticleManager } from "./managers/particles";
import { SmokeParticleManager } from "./managers/smoke-particles";
import { PredictionManager } from "./managers/prediction";
import { FixedTimestepSimulator } from "./managers/fixed-timestep-simulator";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getAssetSpriteInfo } from "@/managers/asset";
import { PlacementManager } from "@/managers/placement";
import { isWeapon, ItemType, type EquipmentSlotKey } from "@shared/util/inventory";
import { getClosestInteractiveEntity } from "@/util/get-closest-interactive";
import { getPlayer } from "@/util/get-player";
import { Entities } from "@shared/constants";
import { FISTS_INVENTORY_SENTINEL } from "@shared/constants/inventory-sentinel";
import { itemRegistry } from "@shared/entities";
import { ClientCarryable } from "@/extensions";
import { PlayerColor } from "@shared/commands/commands";
import { getCraftingStationIdForEntityType } from "@shared/util/crafting-stations";
import { InteractionManager } from "./managers/interaction-manager";
import { ClientEventHandlers } from "./managers/client-event-handlers";
import { DialogueManager } from "./managers/dialogue-manager";
import { QuestCompletedModal } from "./ui/quest-completed-modal";
import { QuestNotificationTracker } from "./managers/quest-notification-tracker";
import { resolveQuestNavigationTarget } from "@/util/resolve-quest-navigation-target";

export class GameClient {
  private ctx: CanvasRenderingContext2D;

  // Managers
  private assetManager: AssetManager;
  private socketManager!: ClientSocketManager;
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private soundManager: SoundManager;
  private clientEventListener!: ClientEventListener;
  private entityFactory: EntityFactory;
  private particleManager: ParticleManager;
  private smokeParticleManager: SmokeParticleManager;
  private predictionManager: PredictionManager;
  private fixedTimestepSimulator: FixedTimestepSimulator;
  private placementManager!: PlacementManager;

  // FPS tracking
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private readonly FPS_UPDATE_INTERVAL = 1000; // Update FPS every second
  private lastUpdateTimeMs: number = Date.now();

  // Controllers
  private resizeController: ResizeController;
  private zoomController: ZoomController;

  // UI
  private renderer: Renderer;
  private hud: Hud;
  private merchantBuyPanel: MerchantBuyPanel;
  private craftingPanel: CraftingPanel;
  private questCompletedModal: QuestCompletedModal;
  private questNotificationTracker!: QuestNotificationTracker;
  // State
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private isStarted = false;
  private isMounted = true;

  // Managers
  private interactionManager: InteractionManager;
  private eventHandlers: ClientEventHandlers;
  private dialogueManager: DialogueManager;

  private canvas: HTMLCanvasElement;

  constructor(
    canvas: HTMLCanvasElement,
    assetManager?: AssetManager,
    soundManager?: SoundManager,
    onRequestExitGame?: () => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    this.assetManager = assetManager || new AssetManager();
    this.storageManager = new StorageManager();
    this.cameraManager = new CameraManager(this.ctx);
    this.zoomController = new ZoomController(this.cameraManager);
    this.soundManager = soundManager || new SoundManager();
    this.entityFactory = new EntityFactory(this.assetManager);
    this.particleManager = new ParticleManager(this);
    this.smokeParticleManager = new SmokeParticleManager(this, this.assetManager);
    this.predictionManager = new PredictionManager();
    this.fixedTimestepSimulator = new FixedTimestepSimulator(getConfig().simulation.FIXED_TIMESTEP);

    // Initialize managers
    this.interactionManager = new InteractionManager();
    this.dialogueManager = new DialogueManager();
    this.eventHandlers = new ClientEventHandlers(this);

    this.eventHandlers.setupEventListeners(canvas);

    const getInventory = () => {
      if (this.gameState.playerId) {
        const entity = getEntityById(this.gameState, this.gameState.playerId);
        // Validate entity is a PlayerClient before accessing inventory
        if (entity && entity instanceof PlayerClient) {
          return entity.getInventory();
        }
      }

      return [];
    };

    const getPlayer = () => {
      if (this.gameState.playerId) {
        const entity = getEntityById(this.gameState, this.gameState.playerId);
        // Validate entity is a PlayerClient before returning
        if (entity && entity instanceof PlayerClient) {
          return entity;
        }
      }

      return null;
    };

    this.mapManager = new MapManager(this);
    this.questCompletedModal = new QuestCompletedModal();

    // TODO: refactor to use event emitter
    this.merchantBuyPanel = new MerchantBuyPanel(this.assetManager, {
      getPlayer,
      onBuy: (merchantId, itemIndex) => {
        this.socketManager.sendMerchantBuy(String(merchantId), itemIndex);
      },
      onSell: (merchantId, inventorySlot) => {
        this.socketManager.sendMerchantSell(merchantId, inventorySlot);
      },
      getCanvas: () => canvas,
    });
    this.craftingPanel = new CraftingPanel(this.assetManager, {
      getPlayer,
      onCraft: (request) => {
        this.socketManager?.sendCraftRequest(request);
      },
      onOpen: () => {
        this.gameState.crafting = true;
        this.socketManager?.sendStartCrafting();
      },
      onClose: () => {
        this.gameState.crafting = false;
        this.socketManager?.sendStopCrafting();
      },
      getCanvas: () => canvas,
    });

    this.inputManager = new InputManager({
      getInventory,
      getMaxInventorySlots: () => {
        const player = getPlayer();
        return player instanceof PlayerClient
          ? player.getAccessibleInventorySlotCount()
          : getConfig().player.MAX_INVENTORY_SLOTS;
      },
      isMerchantPanelOpen: () => this.merchantBuyPanel.isVisible(),
      isCraftingPanelOpen: () => this.craftingPanel.isVisible(),
      isBankOpen: () => this.hud.isBankOpen(),
      isFullscreenMapOpen: () => this.hud.isFullscreenMapOpen(),
      isInventoryScreenOpen: () => this.hud.isInventoryScreenOpen(),
      getCameraCenterScreenX: (canvasWidth: number) =>
        this.hud.getInventoryCameraCenterScreenX(canvasWidth),
      getInventoryActiveTab: () => this.hud.getInventoryActiveTab(),
      isNpcDialogueOpen: () => this.gameState.openDialogueNpcId != null,
      isQuestCompletedModalOpen: () => this.questCompletedModal.isOpen(),
      isPlayerDead: () => {
        const player = getPlayer();
        return player ? player.isDead() : false;
      },
    });

    this.setupInputEvents();

    // Create HUD after inputManager is initialized
    this.hud = new Hud({
      mapManager: this.mapManager,
      soundManager: this.soundManager,
      assetManager: this.assetManager,
      inputManager: this.inputManager,
      getMyPlayer: () => {
        const p = getPlayer();
        return p instanceof PlayerClient ? p : null;
      },
      sendDropItem: (slotIndex, amount) => {
        this.socketManager?.sendDropItem(slotIndex, amount);
      },
      sendSwapItems: (fromSlotIndex, toSlotIndex) => {
        this.socketManager?.sendSwapItems(fromSlotIndex, toSlotIndex);
      },
      sendSwapBagAndEquipment: (bagIndex, equipSlot) => {
        this.socketManager?.sendSwapBagAndEquipment(bagIndex, equipSlot);
      },
      sendProgressionAllocations: (kind, allocations) => {
        this.socketManager?.sendProgressionAllocations(kind, allocations);
      },
      sendSelectWeaponLoadout: (loadout) => {
        this.socketManager?.sendSelectWeaponLoadout(loadout);
      },
      sendSetWeaponLoadoutSlot: (slot, bagIndex) => {
        this.socketManager?.sendSetWeaponLoadoutSlot(slot, bagIndex);
      },
      sendBankAction: (data) => {
        this.socketManager?.sendBankAction(data);
      },
      sendConsumeItem: (itemType) => {
        this.socketManager?.sendConsumeItem(itemType);
      },
      sendDropFromEquipment: (equipSlot) => {
        this.socketManager?.sendDropFromEquipment(equipSlot);
      },
      onRequestExitGame,
    });
    this.hud.setDialogueQuestChoiceHandler((action) => {
      const offer = this.dialogueManager.getOpenQuestOffer(this.gameState);
      if (!offer || !this.hud.isDialogueLineFullyRevealed(this.gameState)) {
        return;
      }

      this.dialogueManager.closeDialogue(this.gameState, offer.npcEntityId, action === "accept");
    });

    this.questNotificationTracker = new QuestNotificationTracker({
      getMyPlayer: () => this.getMyPlayer(),
      getAuthoredQuests: () => this.mapManager.getAuthoredQuests(),
      addHudMessage: (message, color) => this.hud.addMessage(message, color),
      questCompletedModal: this.questCompletedModal,
    });

    this.gameState = new GameState();
    this.gameState.questDataSource = {
      getQuestStepCount: (questId) => {
        const def = this.mapManager.getAuthoredQuests().find((q) => q.id === questId);
        return def?.steps.length;
      },
      getQuestDefinition: (questId) =>
        this.mapManager.getAuthoredQuests().find((q) => q.id === questId),
    };

    this.renderer = new Renderer(
      this.ctx,
      this.gameState,
      this.mapManager,
      this.hud,
      this.merchantBuyPanel,
      this.craftingPanel,
      this.questCompletedModal,
      this.particleManager,
      () => this.getPlacementManager(),
    );

    // Set renderer reference on minimap so it can use the spatial grid
    this.hud.setRenderer(this.renderer);

    this.resizeController = new ResizeController(this.renderer);
  }

  public getDialogueManager(): DialogueManager {
    return this.dialogueManager;
  }

  private setupInputEvents(): void {
    const im = this.inputManager;

    // HUD toggles
    im.on("toggleInventoryScreen", () => this.hud.toggleInventoryScreen());
    im.on("inventoryPanelFocusTab", ({ tab }) => this.hud.focusInventoryTab(tab));
    im.on("toggleQuestJournal", () => this.hud.toggleQuestJournal());
    im.on("showPlayerList", () => this.hud.setShowPlayerList(true));
    im.on("hidePlayerList", () => this.hud.setShowPlayerList(false));
    im.on("toggleMap", () => this.hud.toggleFullscreenMap());
    im.on("toggleMute", () => this.soundManager.toggleMute());
    im.on("dismissQuestCompletedModal", () => this.questCompletedModal.dismissCurrent());

    // Chat
    im.on("toggleChat", () => this.hud.toggleChatInput());
    im.on("chatInput", ({ key, shiftKey }) => this.hud.updateChatInput(key, shiftKey));
    im.on("sendChat", () => {
      const message = this.hud.getChatInput();
      if (message.trim()) {
        this.hud.saveChatMessage(message.trim());
        this.socketManager?.sendChatMessage(message.trim());
        this.hud.clearChatInput();
      }
    });

    // Panels
    im.on("merchantKeyDown", ({ key }) => this.merchantBuyPanel.handleKeyDown(key));
    im.on("craftingPanelKeyDown", ({ key }) => this.craftingPanel.handleKeyDown(key));
    im.on("escape", () => {
      if (this.dialogueManager.declineOpenQuestOffer(this.gameState)) return;
      if (this.hud.isInventoryScreenOpen()) { this.hud.setInventoryScreenOpen(false); return; }
      if (this.craftingPanel.isVisible()) { this.craftingPanel.close(); return; }
      if (this.merchantBuyPanel.isVisible()) { this.merchantBuyPanel.close(); }
    });

    // Inventory & items
    im.on("selectInventorySlot", ({ slot }) => this.socketManager?.sendSelectInventorySlot(slot));
    im.on("consumeItem", ({ itemType }) => this.socketManager?.sendConsumeItem(itemType));
    im.on("dropItem", ({ slot, amount }) => this.socketManager?.sendDropItem(slot, amount));
    im.on("inventorySlotChanged", ({ slot }) => this.handleLocalInventorySlotChanged(slot));

    // Combat & loadout
    im.on("selectWeaponLoadout", ({ loadout }) => this.socketManager?.sendSelectWeaponLoadout(loadout));
    im.on("useLoadoutConsumable", ({ which }) => {
      const p = this.getMyPlayer();
      if (!p || !(p instanceof PlayerClient)) return;
      const bag = which === 0 ? (p as any).loadoutConsumable4 : (p as any).loadoutConsumable5;
      if (typeof bag !== "number" || bag < 1) return;
      this.socketManager?.sendUseLoadoutConsumable(which);
    });
    im.on("reloadWeapon", () => this.socketManager?.sendReloadWeapon());
    im.on("requestCombatRoll", ({ direction }) => {
      const player = this.getMyPlayer();
      if (!player || !player.hasExt(ClientPositionable)) return;
      this.socketManager?.sendRequestCombatRoll(this.directionToAngle(direction));
    });

    // Interaction
    im.on("interactStart", () => this.handleInteractStart());
    im.on("interactEnd", () => this.interactionManager.cancelInteractHold(this.gameState));
  }

  private handleInteractStart(): void {
    if (this.merchantBuyPanel.isVisible()) { this.merchantBuyPanel.close(); return; }
    if (this.craftingPanel.isVisible()) { this.craftingPanel.close(); return; }

    const player = this.getMyPlayer();
    const maxInteract = getConfig().player.MAX_INTERACT_RADIUS;

    if (this.gameState.openDialogueNpcId != null) {
      const openEnt = getEntityById(this.gameState, this.gameState.openDialogueNpcId);
      if (
        openEnt &&
        (openEnt.getType() === "dialogue_survivor_npc" || openEnt.getType() === "message_decal") &&
        player &&
        openEnt.hasExt(ClientPositionable) &&
        player.hasExt(ClientPositionable)
      ) {
        const d = distance(
          player.getExt(ClientPositionable).getCenterPosition(),
          openEnt.getExt(ClientPositionable).getCenterPosition(),
        );
        if (d <= maxInteract) {
          if (!this.hud.isDialogueLineFullyRevealed(this.gameState)) {
            this.hud.completeDialogueLine(this.gameState);
            return;
          }
          this.dialogueManager.advance(this.gameState);
          return;
        }
      }
    }

    if (player) {
      const spatialGrid = this.renderer?.spatialGrid ?? null;
      if (this.dialogueManager.tryOpenDialogue(this.gameState, player, spatialGrid)) return;
    }

    if (player) {
      const closest = getClosestInteractiveEntity(this.gameState, this.renderer?.spatialGrid ?? null);
      if (closest) {
        if (closest.getType() === Entities.LOCKER) {
          if (
            player.hasExt(ClientPositionable) &&
            closest.hasExt(ClientPositionable) &&
            distance(
              player.getExt(ClientPositionable).getCenterPosition(),
              closest.getExt(ClientPositionable).getCenterPosition(),
            ) <= maxInteract
          ) {
            if (this.hud.isBankOpen()) {
              if (this.hud.shouldCloseFullInventoryWhenTogglingBank()) {
                this.hud.setInventoryScreenOpen(false);
              } else {
                this.hud.closeBank();
              }
              return;
            }
            const inventoryWasAlreadyOpen = this.hud.isInventoryScreenOpen();
            this.hud.setInventoryScreenOpen(true);
            this.hud.openBank(closest.getId(), inventoryWasAlreadyOpen);
            return;
          }
        }
        const stationId = getCraftingStationIdForEntityType(closest.getType());
        if (stationId) {
          if (stationId !== "campfire" || this.canUseCampfireForCrafting(player, closest)) {
            this.craftingPanel.open(closest.getId(), stationId);
            return;
          }
        }

        if (closest.getType() === "merchant") {
          const merchant = closest as any;
          const shopItems = merchant.getShopItems?.();
          if (shopItems && shopItems.length > 0) {
            this.merchantBuyPanel.open(closest.getId(), shopItems);
            return;
          }
        }
      }
    }

    // Start interact hold
    const spatialGrid = this.renderer?.spatialGrid ?? null;
    const entityId = this.interactionManager.startInteractHold(
      this.gameState, spatialGrid, (message, color) => this.hud.addMessage(message, color),
    );

    if (entityId !== null) {
      const entity = getEntityById(this.gameState, entityId);
      if (entity && !entity.hasExt(ClientPlaceable) && this.socketManager) {
        this.socketManager.sendInteract(entityId);
      }
    }
  }

  /**
   * Connect to the game server
   */
  public async connectToServer(serverUrl: string): Promise<void> {
    this.socketManager = new ClientSocketManager(serverUrl);
    this.dialogueManager.setSendDialogueNpcComplete((npcEntityId, acceptQuest) => {
      this.socketManager.sendDialogueNpcComplete(npcEntityId, acceptQuest);
    });
    this.clientEventListener = new ClientEventListener(this, this.socketManager);

    await this.socketManager.connect();

    // Server pushes YOUR_ID + full state on connect (see player-session-lifecycle).
    this.clientEventListener.onTransportConnected();

    this.socketManager.startPingMeasurement();

    // Send saved player color if exists
    const savedColor = localStorage.getItem("playerColor");
    if (savedColor) {
      this.socketManager.sendPlayerColor(savedColor as PlayerColor);
    }

    // Initialize placement manager
    this.placementManager = new PlacementManager(
      this.ctx.canvas,
      this.cameraManager,
      this.mapManager,
      () => this.getMyPlayer(),
      () => this.gameState.getEntities(),
      () => this.socketManager.getSocket(),
    );

  }

  public getSoundManager(): SoundManager {
    return this.soundManager;
  }

  public playPositionalSound(sound: SoundType, position: Vector2): void {
    this.soundManager.playPositionalSound(sound, position, this.getListenerPosition() ?? undefined);
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public removeEntity(id: number) {
    removeEntityFromState(this.gameState, id);
  }

  public getSocketManager(): ClientSocketManager {
    return this.socketManager;
  }

  public getMyPlayer(): PlayerClient | null {
    if (!this.gameState.playerId) {
      return null;
    }
    const entity = getEntityById(this.gameState, this.gameState.playerId);
    // Validate entity is a PlayerClient before returning
    if (entity && entity instanceof PlayerClient) {
      return entity;
    }
    return null;
  }

  public getPlacementManager(): PlacementManager | null {
    return this.placementManager || null;
  }

  public shakeCamera(intensity: number, durationMs: number = 200): void {
    this.cameraManager.shake(intensity, durationMs);
  }

  public getMapManager(): MapManager {
    return this.mapManager;
  }

  public getHud(): Hud {
    return this.hud;
  }

  public getCraftingPanel(): CraftingPanel {
    return this.craftingPanel;
  }

  public getZoomController(): ZoomController {
    return this.zoomController;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  public getInputManager(): InputManager {
    return this.inputManager;
  }

  public getCameraManager(): CameraManager {
    return this.cameraManager;
  }

  public getMerchantBuyPanel(): MerchantBuyPanel {
    return this.merchantBuyPanel;
  }

  /** Call on full game state so we don't toast quests already completed in that snapshot. */
  public resetQuestCompletionTracking(): void {
    this.questNotificationTracker.reset();
  }

  private canUseCampfireForCrafting(player: PlayerClient, entity: ClientEntityBase): boolean {
    if (!entity.hasExt(ClientPositionable)) {
      return false;
    }
    const bind = player.getRespawnBindTile();
    if (!bind) {
      return false;
    }
    const pos = entity.getExt(ClientPositionable).getPosition();
    const tileSize = getConfig().world.TILE_SIZE;
    return bind.x === Math.floor(pos.x / tileSize) && bind.y === Math.floor(pos.y / tileSize);
  }

  /** After each game state update: detect newly completed quests and enqueue modals. */
  public pollQuestCompletionEvents(): void {
    this.questNotificationTracker.poll(this.gameState);
  }

  public isChatting(): boolean {
    return this.inputManager.isChatInputActive();
  }

  public async loadAssets() {
    await this.assetManager.load();
  }

  public sendInput(input: Input): void {
    this.socketManager.sendInput(input);
  }

  public getImageLoader(): ImageLoader {
    return this.assetManager;
  }

  public getParticleManager(): ParticleManager {
    return this.particleManager;
  }

  public unmount() {
    if (!this.isMounted) {
      return;
    }

    this.stop();
    this.resizeController.cleanUp();

    // Stop background music
    this.soundManager.stopBackgroundMusic();
    // Stop battle music
    this.soundManager.stopBattleMusic();

    // Clean up input manager event listeners
    if (this.inputManager) {
      this.inputManager.cleanup();
    }

    if (this.eventHandlers) {
      this.eventHandlers.cleanup();
    }

    // Disconnect from server to prevent duplicate connections
    if (this.socketManager) {
      this.socketManager.disconnect();
    }

    this.isMounted = false;
  }

  public getEntityById(id: number) {
    return getEntityById(this.gameState, id);
  }

  public start(): void {
    if (!this.isMounted || this.isStarted) {
      return;
    }

    this.isStarted = true;
    this.lastUpdateTimeMs = performance.now();

    const tick = () => {
      this.update();
      this.renderer.render();
      this.animationFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  public stop(): void {
    if (!this.isStarted) {
      return;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.isStarted = false;
  }

  private update(): void {
    // Update FPS
    this.frameCount++;
    const now = performance.now();
    const deltaSecondsRaw = (now - this.lastUpdateTimeMs) / 1000;
    this.lastUpdateTimeMs = now;
    // Clamp to avoid large jumps on tab switches; cap to allow up to 10 steps catch-up (~0.5 seconds)
    // This ensures responsiveness even at very low FPS (e.g., 20 FPS)
    const maxDeltaSeconds = getConfig().simulation.FIXED_TIMESTEP * 10;
    const deltaSeconds = Math.max(0, Math.min(deltaSecondsRaw, maxDeltaSeconds));
    this.gameState.dt = deltaSeconds;

    this.gameState.questNavigationTarget = resolveQuestNavigationTarget(
      this.gameState,
      this.getMyPlayer(),
    );

    const nowMs = Date.now();
    if (nowMs - this.lastFpsUpdate >= this.FPS_UPDATE_INTERVAL) {
      this.currentFps = Math.round((this.frameCount * 1000) / (nowMs - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = nowMs;
      this.hud.updateFps(this.currentFps);
    }

    // Predict local player movement using fixed timestep simulation
    // This ensures consistent movement speed regardless of frame rate
    const player = this.getMyPlayer();
    if (player && player instanceof PlayerClient) {
      const mapData = this.mapManager.getMapData();

      // Only predict movement and send input if player is alive
      const isAlive =
        !player.hasExt(ClientDestructible) || !player.getExt(ClientDestructible).isDead();

      if (isAlive) {
        // Get inputs with aim angle calculated from mouse position
        if (!player.hasExt(ClientPositionable)) {
          return; // Player doesn't have position yet
        }
        const playerPos = player.getExt(ClientPositionable).getCenterPosition();
        const cameraPos = this.cameraManager.getPosition();
        const cameraScale = this.cameraManager.getScale();
        const input = this.inputManager.getInputsWithAim(
          playerPos,
          cameraPos,
          this.ctx.canvas.width,
          this.ctx.canvas.height,
          cameraScale,
        );

        // Check if facing direction changed (for mouse aiming)
        // Ensure player has getInput method before calling it
        const previousInput = typeof player.getInput === "function" ? player.getInput() : null;
        const facingChanged = previousInput?.facing !== input.facing;
        // Check if aimAngle changed (important for continuous firing while moving mouse)
        const aimAngleChanged =
          (previousInput?.aimAngle !== undefined || input.aimAngle !== undefined) &&
          previousInput?.aimAngle !== input.aimAngle;

        // Update local player's input immediately for responsive facing direction
        player.setInput(input);

        // Track whether player has movement input
        const hasMovementInput = input.dx !== 0 || input.dy !== 0;
        const reconciliationManager = this.predictionManager.getReconciliationManager();
        reconciliationManager.setIsMoving(hasMovementInput);

        // Use fixed timestep simulator for consistent physics
        // Pass the calculated deltaSeconds to ensure accurate timing, especially at low FPS
        // This ensures client and server use the same timestep
        this.fixedTimestepSimulator.update((fixedDeltaTime) => {
          // deltaTime is always FIXED_TIMESTEP (0.05 seconds) for physics
          this.predictionManager.predictLocalPlayerMovement(
            player,
            input,
            fixedDeltaTime, // Always 0.05, matching server
            mapData.collidables,
            this.gameState.getEntities(),
          );
        }, deltaSeconds);

        // Send input to server when it changed, facing direction changed, or aimAngle changed
        const shouldSendInput =
          this.inputManager.getHasChanged() || facingChanged || aimAngleChanged;
        if (shouldSendInput) {
          this.sendInput(input);
          this.inputManager.reset();
        }

        // After prediction, smoothly reconcile towards server's authoritative position
        reconciliationManager.reconcile(
          player,
          (player as any).serverGhostPos || player.getPosition(),
        );

        // Update spatial grid after position changes from prediction/reconciliation
        // This ensures the player is always findable in the spatial grid for rendering
        this.renderer.updateEntityInSpatialGrid(player);
      } else {
        // Player is dead - check if respawn cooldown has expired
        if (player.isDead()) {
          const cooldownRemaining = player.getRespawnCooldownRemaining();
          if (cooldownRemaining === 0) {
            // Cooldown expired, automatically request respawn
            this.socketManager.requestRespawn();
          }
        }
      }
    }

    this.mapManager.tickLocalMapExplorationReveal(this.getMyPlayer());

    this.positionCameraOnPlayer();
    this.updateInteractHold();
    this.hud.update(this.gameState);
    this.smokeParticleManager.update(deltaSeconds);
    this.updatePlayerMovementSounds();
    this.updateCampfireSounds();
    this.updateCursorVisibility();
  }

  /**
   * Check if an item can be picked up (merged into existing slot) or requires a new slot
   */
  private canItemBePickedUp(entity: ClientEntityBase): boolean {
    const player = getPlayer(this.gameState);
    if (!player || !player.hasExt(ClientInventory)) {
      return false;
    }

    if (!entity.hasExt(ClientCarryable)) {
      return true; // Not a carryable item, can always interact
    }

    const inventory = player.getExt(ClientInventory);

    // If inventory is not full, can always pick up
    if (!inventory.isFull()) {
      return true;
    }

    // Check if item is stackable (can merge with existing)
    // Items are stackable if:
    // - They have category "ammo" (all ammo items are stackable)
    // - They have a count state property (meaning they're stackable in inventory)
    const carryable = entity.getExt(ClientCarryable);
    const itemType = carryable.getItemKey() as ItemType;
    const itemState = carryable.getItemState();
    const itemConfig = itemRegistry.get(itemType);
    const hasCountState = itemState && typeof itemState.count === "number";
    const isStackable = itemConfig?.category === "ammo" || hasCountState;

    // If stackable, check if player already has this item type
    if (isStackable) {
      const items = inventory.getItems();
      return items.some((item) => item?.itemType === itemType);
    }

    // Not stackable and inventory is full - cannot pick up
    return false;
  }

  /**
   * Show inventory full message with cooldown
   */
  private static lastInventoryFullMessageTime: number = 0;
  private static readonly INVENTORY_FULL_MESSAGE_COOLDOWN = 2000; // 2 seconds

  private showInventoryFullMessage(): void {
    const now = Date.now();
    const timeSinceLastMessage = now - GameClient.lastInventoryFullMessageTime;

    // Only show message if enough time has passed since the last one
    if (timeSinceLastMessage >= GameClient.INVENTORY_FULL_MESSAGE_COOLDOWN) {
      GameClient.lastInventoryFullMessageTime = now;
      this.hud.addMessage("Inventory full!", "red");
    }
  }

  // Interaction methods moved to InteractionManager

  /**
   * Update interact hold progress and send event when complete
   */
  private updateInteractHold(): void {
    const entityId = this.interactionManager.updateInteractHold(
      this.gameState,
      this.inputManager,
      (message, color) => this.hud.addMessage(message, color),
    );

    // If interaction should be triggered, send it to server
    if (entityId !== null && this.socketManager) {
      this.socketManager.sendInteract(entityId);
    }
  }

  private handleLocalInventorySlotChanged(slot: number): void {
    const player = this.getMyPlayer();
    if (player) {
      player.setLocalInventorySlot(slot);
    }
  }

  /**
   * Sync client's inputManager inventory slot with server's inputInventoryItem
   * This ensures UI and visual representation stay in sync
   * This method updates the inputManager without triggering server callbacks
   */
  public syncInventorySlotFromServer(slot: number | null | undefined): void {
    if (slot === null || slot === undefined) {
      return; // Don't sync if server hasn't set it yet
    }
    // Server slot is 1-indexed, inputManager expects 1-indexed
    // Use silent method to avoid sending update back to server
    this.inputManager.setInventorySlotSilent(slot);
  }

  /**
   * Update cursor visibility based on whether player has a weapon equipped
   */
  private updateCursorVisibility(): void {
    // Show cursor if any UI overlay is active
    if (
      this.merchantBuyPanel.isVisible() ||
      this.craftingPanel.isVisible() ||
      (this.hud && this.hud.isFullscreenMapOpen()) ||
      (this.hud && this.hud.isHoveringInventory()) ||
      (this.hud && this.hud.isHoveringMuteButton()) ||
      (this.hud && this.hud.isHoveringExitGameButton()) ||
      this.inputManager.isChatInputActive()
    ) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const player = this.getMyPlayer();
    if (!player) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    // Defensive check: ensure player has inventory extension
    if (!player.hasExt(ClientInventory)) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const activeSlot = this.inputManager.getCurrentInventorySlot();
    const maxSlots = player.getMaxInventorySlots();
    if (activeSlot === FISTS_INVENTORY_SENTINEL) {
      // No custom crosshair while unarmed; keep OS cursor visible (hiding it leaves no pointer).
      this.ctx.canvas.style.cursor = "default";
      return;
    }
    if (activeSlot < 1 || activeSlot > maxSlots) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const weaponItem = player.getResolvedLoadoutWeaponItem();

    const hasWeapon = weaponItem && this.isWeaponItem(weaponItem.itemType);
    // Only hide the system cursor when the renderer has a live mouse position for drawing the crosshair.
    const mouseForCrosshair = this.getRenderer().getMousePosition();
    const hideSystemCursor = !!(hasWeapon && mouseForCrosshair);
    this.ctx.canvas.style.cursor = hideSystemCursor ? "none" : "default";
  }

  /**
   * Update walk/run sounds for all players based on their input state
   */
  private updatePlayerMovementSounds(): void {
    const players = getEntitiesByType(this.gameState, Entities.PLAYER) as PlayerClient[];
    const existingPlayerIds = new Set<number>();
    const listenerPos = this.getListenerPosition();

    for (const player of players) {
      if (!player.hasExt(ClientPositionable)) return;

      const playerId = player.getId();
      existingPlayerIds.add(playerId);

      // Get player input to determine if they're intentionally moving
      // Safety check: ensure getInput method exists before calling
      if (typeof player.getInput !== "function") return;
      const input = player.getInput();
      const hasMovementInput = input.dx !== 0 || input.dy !== 0;

      // Only play sounds if player has movement input (not just velocity from knockback)
      if (hasMovementInput) {
        const position = player.getPosition();
        const soundType = input.sprint ? SOUND_TYPES_TO_MP3.RUN : SOUND_TYPES_TO_MP3.WALK;
        this.soundManager.updateLoopingSound(playerId, soundType, position, listenerPos ?? undefined);
      } else {
        // Player is not moving intentionally, stop the sound
        this.soundManager.updateLoopingSound(playerId, null, player.getPosition(), listenerPos ?? undefined);
      }
    }

    // Clean up sounds for players that no longer exist
    this.soundManager.cleanupLoopingSounds(existingPlayerIds);

    // Update volumes for all active looping sounds based on current positions
    this.soundManager.updateLoopingSoundsVolumes(listenerPos, (id) => {
      const entity = getEntityById(this.gameState, id);
      if (!entity || !entity.hasExt(ClientPositionable)) return null;
      return entity.getExt(ClientPositionable).getPosition();
    });
  }

  /**
   * Update campfire sound volume based on distance
   * The sound is always playing on loop, we just adjust the volume
   */
  private updateCampfireSounds(): void {
    const fires = getEntitiesByType(this.gameState, Entities.CAMPSITE_FIRE);
    const positions: Vector2[] = [];
    for (const entity of fires) {
      if (entity.hasExt(ClientPositionable)) {
        positions.push(entity.getExt(ClientPositionable).getPosition());
      }
    }
    if (positions.length > 0) {
      this.soundManager.updateCampfireSoundVolume(positions, this.getListenerPosition());
    } else {
      this.soundManager.stopCampfireSound();
    }
  }

  private positionCameraOnPlayer(): void {
    const playerToFollow = this.getMyPlayer() as PlayerClient | undefined;

    if (playerToFollow && playerToFollow.hasExt(ClientPositionable)) {
      const canvas = this.ctx.canvas;
      const invCx = this.hud.getInventoryCameraCenterScreenX(canvas.width);
      const screenCenter =
        invCx != null ? { x: invCx, y: canvas.height / 2 } : undefined;
      this.cameraManager.translateTo(
        playerToFollow.getExt(ClientPositionable).getCenterPosition(),
        this.gameState.dt,
        screenCenter,
      );
    }
  }

  public getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }

  /**
   * Check if the current player is a zombie (for React components)
   */
  public isPlayerZombie(): boolean {
    const player = this.getMyPlayer();
    if (!player) return false;
    return player.isZombiePlayer?.() ?? false;
  }

  /**
   * Get sprite sheet info for an item (for React components to use CSS sprites)
   */
  public getItemSpriteInfo(itemType: string): {
    sheet: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    try {
      return getAssetSpriteInfo(itemType);
    } catch (error) {
      console.error(`Failed to get sprite info for ${itemType}:`, error);
      return null;
    }
  }

  /**
   * Get all sprite sheets URLs (for React to preload)
   */
  public getSpriteSheets(): Record<string, string> {
    return {
      default: "/tile-sheet.png",
      items: "/sheets/items-sheet.png",
      characters: "/sheets/characters-sheet.png",
    };
  }

  /**
   * Convert canvas coordinates to world coordinates
   */
  private canvasToWorld(canvasX: number, canvasY: number, canvas: HTMLCanvasElement): Vector2 {
    const cameraScale = this.cameraManager.getScale();
    const cameraPos = this.cameraManager.getPosition();
    const invCx = this.hud.getInventoryCameraCenterScreenX(canvas.width);
    const centerX = invCx != null ? invCx : canvas.width / 2;
    const centerY = canvas.height / 2;

    const worldX = (canvasX - centerX) / cameraScale + cameraPos.x;
    const worldY = (canvasY - centerY) / cameraScale + cameraPos.y;

    return PoolManager.getInstance().vector2.claim(worldX, worldY);
  }

  private directionToAngle(direction: Direction): number {
    switch (direction) {
      case Direction.Up:
        return -Math.PI / 2;
      case Direction.Down:
        return Math.PI / 2;
      case Direction.Left:
        return Math.PI;
      case Direction.Right:
      default:
        return 0;
    }
  }

  private getListenerPosition(): Vector2 | null {
    const player = this.getMyPlayer();
    if (!player || !player.hasExt(ClientPositionable)) return null;
    return player.getExt(ClientPositionable).getPosition();
  }

  /**
   * Check if an item type is a weapon that can be fired
   */
  private isWeaponItem(itemType: string): boolean {
    return isWeapon(itemType as ItemType);
  }
}
