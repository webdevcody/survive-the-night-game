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
import { StorageManager } from "@/managers/storage";
import { Hud } from "@/ui/hud";
import { EntityFactory } from "@/entities/entity-factory";
import { Renderer } from "@/renderer";
import { ZoomController } from "@/zoom-controller";
import { ResizeController } from "@/resize-controller";
import { ClientEventListener } from "@/client-event-listener";
import { SoundManager, SOUND_TYPES_TO_MP3 } from "@/managers/sound-manager";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
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
import { CampsiteFireClient } from "@/entities/environment/campsite-fire";
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
import { InteractionManager } from "./managers/interaction-manager";
import { ClientEventHandlers } from "./managers/client-event-handlers";
import { DialogueSurvivorNpcClient } from "./entities/environment/dialogue-survivor-npc";
import { QuestCompletedModal, formatQuestRewardsForDisplay } from "./ui/quest-completed-modal";

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
  private gameOverDialog: GameOverDialogUI;
  private questCompletedModal: QuestCompletedModal;
  /** Tracks `completed` quest ids we've already announced (null = seed on next poll). */
  private questCompletionBaseline: Set<string> | null = null;
  /** Tracks active quest ids we've already seen (null = seed on next poll). */
  private questActiveBaseline: Set<string> | null = null;
  // State
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private isStarted = false;
  private isMounted = true;

  // Managers
  private interactionManager: InteractionManager;
  private eventHandlers: ClientEventHandlers;

  // Cached campsite fire reference (there should only ever be one)
  private campsiteFire: CampsiteFireClient | null = null;

  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, assetManager?: AssetManager, soundManager?: SoundManager) {
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
    this.gameOverDialog = new GameOverDialogUI();
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

    // TODO: refactor to use event emitter
    this.inputManager = new InputManager({
      getInventory,
      isMerchantPanelOpen: () => this.merchantBuyPanel.isVisible(),
      isFullscreenMapOpen: () => this.hud.isFullscreenMapOpen(),
      isInventoryScreenOpen: () => this.hud.isInventoryScreenOpen(),
      onToggleInventoryScreen: () => {
        this.hud.toggleInventoryScreen();
      },
      onToggleQuestJournal: () => {
        this.hud.toggleQuestJournal();
      },
      onToggleInstructions: () => {
        this.hud.toggleInstructions();
      },
      onShowPlayerList: () => {
        this.hud.setShowPlayerList(true);
      },
      onHidePlayerList: () => {
        this.hud.setShowPlayerList(false);
      },
      onToggleChat: () => {
        this.hud.toggleChatInput();
      },
      onChatInput: (key: string, shiftKey: boolean) => {
        this.hud.updateChatInput(key, shiftKey);
      },
      onSendChat: () => {
        const message = this.hud.getChatInput();
        if (message.trim()) {
          this.hud.saveChatMessage(message.trim());
          this.socketManager.sendChatMessage(message.trim());
          this.hud.clearChatInput();
        }
      },
      onToggleMute: () => {
        this.soundManager.toggleMute();
      },
      onToggleMap: () => {
        this.hud.toggleFullscreenMap();
      },
      onDown: (inputs: Input) => {
        inputs.dy = 1;
        inputs.facing = Direction.Down;
      },
      onRight: (inputs: Input) => {
        inputs.dx = 1;
        inputs.facing = Direction.Right;
      },
      onLeft: (inputs: Input) => {
        inputs.dx = -1;
        inputs.facing = Direction.Left;
      },
      isNpcDialogueOpen: () => this.gameState.openDialogueNpcId != null,
      onNpcDialogueSpaceDown: () => this.handleNpcDialogueSpace(),
      isQuestCompletedModalOpen: () => this.questCompletedModal.isOpen(),
      onDismissQuestCompletedModal: () => this.questCompletedModal.dismissCurrent(),
      onInteractStart: () => {
        // If merchant panel is open, close it (toggle functionality)
        if (this.merchantBuyPanel.isVisible()) {
          this.merchantBuyPanel.close();
          return;
        }

        const player = getPlayer();
        const maxInteract = getConfig().player.MAX_INTERACT_RADIUS;

        if (this.gameState.openDialogueNpcId != null) {
          const openEnt = getEntityById(this.gameState, this.gameState.openDialogueNpcId);
          if (
            openEnt &&
            openEnt.getType() === "dialogue_survivor_npc" &&
            player &&
            openEnt.hasExt(ClientPositionable) &&
            player.hasExt(ClientPositionable)
          ) {
            const d = distance(
              player.getExt(ClientPositionable).getCenterPosition(),
              openEnt.getExt(ClientPositionable).getCenterPosition(),
            );
            if (d <= maxInteract) {
              const npc = openEnt as DialogueSurvivorNpcClient;
              const lines = npc.getDialogueLines();
              const idx = this.gameState.dialogueLineIndex;
              if (lines.length > 0 && idx >= lines.length - 1) {
                this.closeNpcDialogueWithCompletion(npc.getId());
              }
              return;
            }
          }
        }

        if (player) {
          const spatialGrid = this.renderer?.spatialGrid ?? null;
          let closest = getClosestInteractiveEntity(this.gameState, spatialGrid);
          if (!closest && spatialGrid === null) {
            let bestDist = Infinity;
            let best: ClientEntityBase | null = null;
            for (const e of getEntitiesByType(this.gameState, "dialogue_survivor_npc")) {
              if (!e.hasExt(ClientPositionable)) continue;
              const d = distance(
                player.getExt(ClientPositionable).getCenterPosition(),
                e.getExt(ClientPositionable).getCenterPosition(),
              );
              if (d <= maxInteract && d < bestDist) {
                bestDist = d;
                best = e;
              }
            }
            closest = best;
          }
          if (closest?.getType() === "dialogue_survivor_npc" && closest.hasExt(ClientPositionable)) {
            const d = distance(
              player.getExt(ClientPositionable).getCenterPosition(),
              closest.getExt(ClientPositionable).getCenterPosition(),
            );
            if (d <= maxInteract) {
              this.gameState.openDialogueNpcId = closest.getId();
              this.gameState.dialogueLineIndex = 0;
              return;
            }
          }
        }

        // Check if there's a merchant nearby
        if (player) {
          const playerPos = player.getPosition();
          const merchants = getEntitiesByType(this.gameState, "merchant");

          for (const merchantEntity of merchants) {
            if (merchantEntity.hasExt(ClientPositionable)) {
              const merchantPos = merchantEntity.getExt(ClientPositionable).getPosition();
              const merchantCenterPos = merchantEntity
                .getExt(ClientPositionable)
                .getCenterPosition();
              const dist = distance(playerPos, merchantCenterPos);

              if (dist <= getConfig().player.MAX_INTERACT_RADIUS) {
                // Cast to MerchantClient to access shop items
                const merchant = merchantEntity as any;
                const shopItems = merchant.getShopItems?.();
                if (shopItems && shopItems.length > 0) {
                  // Open merchant panel
                  this.merchantBuyPanel.open(merchantEntity.getId(), shopItems);
                  return;
                }
              }
            }
          }
        }

        // Start interact hold
        const spatialGrid = this.renderer?.spatialGrid ?? null;
        const entityId = this.interactionManager.startInteractHold(
          this.gameState,
          spatialGrid,
          (message, color) => this.hud.addMessage(message, color),
        );

        // If entity ID returned and not placeable, send interact immediately
        if (entityId !== null) {
          const entity = getEntityById(this.gameState, entityId);
          if (entity && !entity.hasExt(ClientPlaceable) && this.socketManager) {
            this.socketManager.sendInteract(entityId);
          }
        }
      },
      onInteractEnd: () => {
        // Cancel interact hold
        this.interactionManager.cancelInteractHold(this.gameState);
      },
      onSelectInventorySlot: (slotIndex: number) => {
        if (this.socketManager) {
          this.socketManager.sendSelectInventorySlot(slotIndex);
        }
      },
      onConsumeItem: (itemType: string | null) => {
        if (this.socketManager) {
          this.socketManager.sendConsumeItem(itemType);
        }
      },
      onDropItem: (slotIndex: number, amount?: number) => {
        if (this.socketManager) {
          this.socketManager.sendDropItem(slotIndex, amount);
        }
      },
      onFire: (inputs: Input) => {
        inputs.fire = true;
      },
      onUp: (inputs: Input) => {
        inputs.dy = -1;
        inputs.facing = Direction.Up;
      },
      onMerchantKeyDown: (key: string) => {
        this.merchantBuyPanel.handleKeyDown(key);
      },
      onEscape: () => {
        if (this.hud.isInventoryScreenOpen()) {
          this.hud.setInventoryScreenOpen(false);
          return;
        }
        if (this.merchantBuyPanel.isVisible()) {
          this.merchantBuyPanel.close();
        }
      },
      isPlayerDead: () => {
        const player = getPlayer();
        return player ? player.isDead() : false;
      },
      onRespawnRequest: () => {
        this.socketManager.requestRespawn();
      },
      onInventorySlotChanged: (slot) => {
        this.handleLocalInventorySlotChanged(slot);
      },
      onSelectWeaponLoadout: (loadout) => {
        this.socketManager?.sendSelectWeaponLoadout(loadout);
      },
    });

    // Create HUD after inputManager is initialized
    this.hud = new Hud(
      this.mapManager,
      this.soundManager,
      this.assetManager,
      this.gameOverDialog,
      this.inputManager,
      (slotIndex: number, amount?: number) => {
        if (this.socketManager) {
          this.socketManager.sendDropItem(slotIndex, amount);
        }
      },
      (fromSlotIndex: number, toSlotIndex: number) => {
        if (this.socketManager) {
          this.socketManager.sendSwapItems(fromSlotIndex, toSlotIndex);
        }
      },
      (bagIndex: number, equipSlot: EquipmentSlotKey) => {
        if (this.socketManager) {
          this.socketManager.sendSwapBagAndEquipment(bagIndex, equipSlot);
        }
      },
      (kind: "skill" | "character", allocations: Record<string, number>) => {
        this.socketManager?.sendProgressionAllocations(kind, allocations);
      },
      () => {
        const p = getPlayer();
        return p instanceof PlayerClient ? p : null;
      },
      (loadout) => {
        this.socketManager?.sendSelectWeaponLoadout(loadout);
      },
      (slot, bagIndex) => {
        this.socketManager?.sendSetWeaponLoadoutSlot(slot, bagIndex);
      }
    );

    this.gameState = {
      startedAt: Date.now(),
      playerId: 0,
      entities: [],
      entityMap: new Map(),
      entitiesByType: new Map(),
      gameMode: "open_world",
      phaseStartTime: Date.now(),
      phaseDuration: 0,
      totalZombies: 0,
      crafting: false,
      // Server time synchronization
      serverTimeOffset: 0, // Will be calculated when receiving game state updates
      dt: 0,
      // Global illumination multiplier (default: 1.0)
      globalIlluminationMultiplier: 1.0,
      // Darkness hue (default: "red")
      darknessHue: "red",
      openDialogueNpcId: null,
      dialogueLineIndex: 0,
    };

    this.renderer = new Renderer(
      this.ctx,
      this.gameState,
      this.mapManager,
      this.hud,
      this.merchantBuyPanel,
      this.gameOverDialog,
      this.questCompletedModal,
      this.particleManager,
      () => this.getPlacementManager(),
    );

    // Set renderer reference on minimap so it can use the spatial grid
    this.hud.setRenderer(this.renderer);

    this.resizeController = new ResizeController(this.renderer);
  }

  private closeNpcDialogueWithCompletion(npcEntityId: number): void {
    this.gameState.openDialogueNpcId = null;
    this.gameState.dialogueLineIndex = 0;
    this.socketManager?.sendDialogueNpcComplete(npcEntityId);
  }

  private handleNpcDialogueSpace(): void {
    const id = this.gameState.openDialogueNpcId;
    if (id == null) return;
    const openEnt = getEntityById(this.gameState, id);
    if (!openEnt || openEnt.getType() !== "dialogue_survivor_npc") return;
    const npc = openEnt as DialogueSurvivorNpcClient;
    const lines = npc.getDialogueLines();
    if (lines.length === 0) {
      this.closeNpcDialogueWithCompletion(id);
      return;
    }
    if (this.gameState.dialogueLineIndex < lines.length - 1) {
      this.gameState.dialogueLineIndex++;
      return;
    }
    this.closeNpcDialogueWithCompletion(id);
  }

  /**
   * Connect to the game server
   */
  public async connectToServer(serverUrl: string): Promise<void> {
    this.socketManager = new ClientSocketManager(serverUrl);
    this.clientEventListener = new ClientEventListener(this, this.socketManager);

    await this.socketManager.connect();

    // Request player ID and full game state
    this.socketManager.requestPlayerId();
    this.socketManager.requestFullState();

    // Note: Rendering will start automatically when both playerId and full game state
    // are received, handled by checkInitialization() in ClientEventListener
    // The flags are tracked in socketManager and checked by the event handlers

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
      () => this.gameState.entities,
      () => this.socketManager.getSocket(),
    );

    // Set game client reference for sound manager
    this.soundManager.setGameClient(this);
  }

  public getGameOverDialog(): GameOverDialogUI {
    return this.gameOverDialog;
  }

  public getSoundManager(): SoundManager {
    return this.soundManager;
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

  public getZoomController(): ZoomController {
    return this.zoomController;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }

  /** Call on full game state so we don't toast quests already completed in that snapshot. */
  public resetQuestCompletionTracking(): void {
    this.questCompletionBaseline = null;
    this.questActiveBaseline = null;
    this.questCompletedModal.clear();
  }

  /** After each game state update: detect newly completed quests and enqueue modals. */
  public pollQuestCompletionEvents(): void {
    const player = this.getMyPlayer();
    if (!player) return;

    const st = player.getQuestProgressPayload();
    const completed = new Set(st.completed);
    const activeIds = Object.keys(st.active);

    if (this.questCompletionBaseline === null || this.questActiveBaseline === null) {
      this.questCompletionBaseline = new Set(completed);
      this.questActiveBaseline = new Set(activeIds);
      return;
    }

    const prevCompleted = this.questCompletionBaseline;
    const prevActive = this.questActiveBaseline;

    for (const qid of completed) {
      if (!prevCompleted.has(qid)) {
        const def = this.mapManager.getAuthoredQuests().find((q) => q.id === qid);
        this.questCompletedModal.enqueue({
          title: def?.title ?? qid,
          questId: qid,
          rewardLines: formatQuestRewardsForDisplay(def?.rewards ?? []),
        });
      }
    }

    for (const qid of activeIds) {
      if (!prevActive.has(qid)) {
        const def = this.mapManager.getAuthoredQuests().find((q) => q.id === qid);
        const title = def?.title ?? qid;
        this.hud.addMessage(`Quest started: ${title}`, "#d4b060");
      }
    }

    this.questCompletionBaseline = new Set(completed);
    this.questActiveBaseline = new Set(activeIds);
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
            this.gameState.entities,
          );
        }, deltaSeconds);

        // Send input to server when it changed, facing direction changed, or aimAngle changed
        if (this.inputManager.getHasChanged() || facingChanged || aimAngleChanged) {
          // Send input to server
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
      (this.hud && this.hud.isFullscreenMapOpen()) ||
      (this.hud && this.hud.isInventoryScreenOpen()) ||
      (this.hud && this.hud.isHoveringInventory()) ||
      (this.hud && this.hud.isHoveringMuteButton()) ||
      (this.gameOverDialog && this.gameOverDialog.isGameOver()) ||
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

    const invExt = player.getExt(ClientInventory);
    const activeSlot = this.inputManager.getCurrentInventorySlot();
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    if (activeSlot === FISTS_INVENTORY_SENTINEL) {
      this.ctx.canvas.style.cursor = "none";
      return;
    }
    if (activeSlot < 1 || activeSlot > maxSlots) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const activeBagItem = invExt.getActiveItem(activeSlot);
    const weaponItem = invExt.resolveActiveWeapon(activeBagItem);

    const hasWeapon = weaponItem && this.isWeaponItem(weaponItem.itemType);
    this.ctx.canvas.style.cursor = hasWeapon ? "none" : "default";
  }

  /**
   * Update walk/run sounds for all players based on their input state
   */
  private updatePlayerMovementSounds(): void {
    const players = getEntitiesByType(this.gameState, Entities.PLAYER) as PlayerClient[];
    const existingPlayerIds = new Set<number>();

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
        this.soundManager.updateLoopingSound(playerId, soundType, position);
      } else {
        // Player is not moving intentionally, stop the sound
        this.soundManager.updateLoopingSound(playerId, null, player.getPosition());
      }
    }

    // Clean up sounds for players that no longer exist
    this.soundManager.cleanupLoopingSounds(existingPlayerIds);

    // Update volumes for all active looping sounds based on current positions
    this.soundManager.updateLoopingSoundsVolumes();
  }

  /**
   * Update campfire sound volume based on distance
   * The sound is always playing on loop, we just adjust the volume
   */
  private updateCampfireSounds(): void {
    // Find campsite fire if we don't have a cached reference or if it's been removed
    if (!this.campsiteFire || !this.gameState.entityMap.has(this.campsiteFire.getId())) {
      this.campsiteFire =
        (getEntitiesByType(this.gameState, Entities.CAMPFIRE)[0] as CampsiteFireClient) || null;
    }

    // Update sound volume if campsite fire exists
    if (this.campsiteFire && this.campsiteFire.hasExt(ClientPositionable)) {
      const position = this.campsiteFire.getExt(ClientPositionable).getPosition();
      this.soundManager.updateCampfireSoundVolume(position);
    } else {
      // No campsite fire exists, stop the sound
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

  /**
   * Check if an item type is a weapon that can be fired
   */
  private isWeaponItem(itemType: string): boolean {
    return isWeapon(itemType as ItemType);
  }
}
