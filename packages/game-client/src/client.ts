import { AssetManager, ImageLoader } from "@/managers/asset";
import { InputManager } from "@/managers/input";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { PlayerClient } from "@/entities/player";
import { CameraManager } from "@/managers/camera";
import { MapManager } from "@/managers/map";
import { GameState, getEntityById, removeEntity as removeEntityFromState } from "@/state";
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
import { CommandManager } from "@/managers/command-manager";
import { DEBUG_ADMIN_COMMANDS } from "@shared/debug";
import { Direction } from "../../game-shared/src/util/direction";
import { Input } from "../../game-shared/src/util/input";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientDestructible } from "@/extensions/destructible";
import { ClientPositionable, ClientResourcesBag, ClientInventory } from "@/extensions";
import { CampsiteFireClient } from "@/entities/environment/campsite-fire";
import { NoteClient } from "@/entities/items/note";
import { WaveState } from "@shared/types/wave";
import { ParticleManager } from "./managers/particles";
import { PredictionManager } from "./managers/prediction";
import { FixedTimestepSimulator } from "./managers/fixed-timestep-simulator";
import { SequenceManager } from "./managers/sequence-manager";
import { getConfig } from "@shared/config";
import { distance } from "@shared/util/physics";
import Vector2 from "@shared/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { getAssetSpriteInfo } from "@/managers/asset";
import { PlacementManager } from "@/managers/placement";
import { isWeapon, ItemType, InventoryItem } from "@shared/util/inventory";

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
  private commandManager!: CommandManager;
  private clientEventListener!: ClientEventListener;
  private entityFactory: EntityFactory;
  private particleManager: ParticleManager;
  private predictionManager: PredictionManager;
  private fixedTimestepSimulator: FixedTimestepSimulator;
  private sequenceManager: SequenceManager;
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

  // State
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private isStarted = false;
  private isMounted = true;

  // Teleport state
  private isTeleporting: boolean = false;
  private teleportProgress: number = 0;
  private teleportStartTime: number = 0;
  private teleportCancelledByDamage: boolean = false;
  private readonly TELEPORT_DURATION = 3000; // 3 seconds

  // Cached campsite fire reference (there should only ever be one)
  private campsiteFire: CampsiteFireClient | null = null;

  constructor(canvas: HTMLCanvasElement, assetManager?: AssetManager, soundManager?: SoundManager) {
    this.ctx = canvas.getContext("2d")!;

    this.assetManager = assetManager || new AssetManager();
    this.storageManager = new StorageManager();
    this.cameraManager = new CameraManager(this.ctx);
    this.zoomController = new ZoomController(this.cameraManager);
    this.soundManager = soundManager || new SoundManager();
    this.entityFactory = new EntityFactory(this.assetManager);
    this.particleManager = new ParticleManager(this);
    this.predictionManager = new PredictionManager();
    this.fixedTimestepSimulator = new FixedTimestepSimulator(getConfig().simulation.FIXED_TIMESTEP);
    this.sequenceManager = new SequenceManager();

    // Add mousemove event listener for UI hover interactions and aiming
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();

      // Convert CSS coordinates to canvas coordinates
      // This accounts for any CSS scaling of the canvas
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check if fullscreen map is open
      const isFullscreenMapOpen = this.hud?.isFullscreenMapOpen() ?? false;

      // Update inventory bar hover state
      if (this.hud) {
        this.hud.updateMousePosition(x, y, canvas.width, canvas.height);
        this.hud.handleMouseMove(x, y, canvas.width, canvas.height);
      }

      // Block aiming when fullscreen map is open
      if (!isFullscreenMapOpen) {
        // Update input manager mouse position for aiming
        this.inputManager.updateMousePosition(x, y);

        // Update renderer mouse position for cursor rendering
        if (this.renderer) {
          this.renderer.updateMousePosition(x, y);
        }
      }
    });

    // Add mousedown event listener for weapon firing
    canvas.addEventListener("mousedown", (e) => {
      // Only handle left click
      if (e.button !== 0) return;

      const rect = canvas.getBoundingClientRect();

      // Convert CSS coordinates to canvas coordinates
      // This accounts for any CSS scaling of the canvas
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check if fullscreen map is open
      const isFullscreenMapOpen = this.hud?.isFullscreenMapOpen() ?? false;

      // Handle UI clicks (inventory bar, HUD mute button, etc.)
      // HUD handles both hotbar and other UI clicks
      if (this.hud && this.hud.handleClick(x, y, canvas.width, canvas.height)) {
        this.placementManager?.skipNextClick();
        return; // Click was handled by HUD
      }

      // Block weapon firing when fullscreen map is open
      if (isFullscreenMapOpen) {
        return;
      }

      // If click wasn't handled by UI, trigger weapon fire
      const player = getPlayer();
      if (player && !player.isDead()) {
        const inventory = getInventory();
        const activeSlot = this.inputManager.getInputs().inventoryItem;
        const activeItem = inventory[activeSlot - 1];

        // Only fire if player has a weapon equipped
        if (activeItem && this.isWeaponItem(activeItem.itemType)) {
          this.inputManager.triggerFire();
        }
      }
    });

    // Add mouseup event listener to stop firing
    canvas.addEventListener("mouseup", (e) => {
      if (e.button !== 0) return; // Only handle left click

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      // Check if fullscreen map is open
      const isFullscreenMapOpen = this.hud?.isFullscreenMapOpen() ?? false;

      if (this.hud) {
        this.hud.handleMouseUp(x, y, canvas.width, canvas.height);
      }

      // Block weapon release when fullscreen map is open
      if (!isFullscreenMapOpen) {
        this.inputManager.releaseFire();
      }
    });

    const getInventory = () => {
      if (this.gameState.playerId) {
        const player = getEntityById(this.gameState, this.gameState.playerId) as PlayerClient;
        if (player) {
          return player.getInventory();
        }
      }

      return [];
    };

    const getPlayer = () => {
      if (this.gameState.playerId) {
        return getEntityById(this.gameState, this.gameState.playerId) as unknown as PlayerClient;
      }

      return null;
    };

    this.mapManager = new MapManager(this);
    this.gameOverDialog = new GameOverDialogUI();

    // TODO: refactor to use event emitter
    this.merchantBuyPanel = new MerchantBuyPanel(this.assetManager, {
      getPlayer,
      onBuy: (merchantId, itemIndex) => {
        this.socketManager.sendMerchantBuy(merchantId, itemIndex);
      },
    });

    // TODO: refactor to use event emitter
    this.inputManager = new InputManager({
      getInventory,
      isMerchantPanelOpen: () => this.merchantBuyPanel.isVisible(),
      isFullscreenMapOpen: () => this.hud.isFullscreenMapOpen(),
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
      onChatInput: (key: string) => {
        this.hud.updateChatInput(key);
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
      onInteract: (inputs: Input) => {
        // If merchant panel is open, close it (toggle functionality)
        if (this.merchantBuyPanel.isVisible()) {
          this.merchantBuyPanel.close();
          return;
        }

        // Check if there's a merchant nearby
        const player = getPlayer();
        if (player) {
          const playerPos = player.getPosition();
          const merchants = this.gameState.entities.filter((e) => e.getType() === "merchant");

          for (const merchantEntity of merchants) {
            if (merchantEntity.hasExt(ClientPositionable)) {
              const merchantPos = merchantEntity.getExt(ClientPositionable).getPosition();
              const dx = merchantPos.x - playerPos.x;
              const dy = merchantPos.y - playerPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              // MAX_INTERACT_RADIUS from game config is 20
              if (distance <= 20) {
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

          // Check if there's a note nearby
          const notes = this.gameState.entities.filter((e) => e.getType() === "note");
          for (const noteEntity of notes) {
            if (noteEntity.hasExt(ClientPositionable)) {
              const notePos = noteEntity.getExt(ClientPositionable).getPosition();
              const dx = notePos.x - playerPos.x;
              const dy = notePos.y - playerPos.y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance <= 20) {
                const note = noteEntity as NoteClient;
                this.hud.showNote(note.title, note.content);
                return;
              }
            }
          }
        }

        inputs.interact = true;
      },
      onDrop: (inputs: Input) => {
        inputs.drop = true;
      },
      onFire: (inputs: Input) => {
        inputs.fire = true;
      },
      onUp: (inputs: Input) => {
        inputs.dy = -1;
        inputs.facing = Direction.Up;
      },
      onMerchantKey1: () => {
        this.merchantBuyPanel.buySelected(0);
      },
      onMerchantKey2: () => {
        this.merchantBuyPanel.buySelected(1);
      },
      onMerchantKey3: () => {
        this.merchantBuyPanel.buySelected(2);
      },
      onEscape: () => {
        if (this.hud.isNoteOpen()) {
          this.hud.hideNote();
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
      onTeleportStart: () => {
        this.startTeleport();
      },
      onTeleportCancel: () => {
        this.cancelTeleport();
      },
      onInventorySlotChanged: (slot) => {
        this.handleLocalInventorySlotChanged(slot);
      },
      onWeaponSelectByIndex: (index) => {
        this.hud.selectWeaponByIndex(index);
      },
    });

    // Create HUD after inputManager is initialized
    this.hud = new Hud(
      this.mapManager,
      this.soundManager,
      this.assetManager,
      this.gameOverDialog,
      this.inputManager
    );

    this.gameState = {
      startedAt: Date.now(),
      playerId: 0,
      entities: [],
      entityMap: new Map(),
      // Wave system
      waveNumber: 1,
      waveState: WaveState.PREPARATION, // Start in preparation phase
      phaseStartTime: Date.now(),
      phaseDuration: getConfig().wave.FIRST_WAVE_DELAY,
      totalZombies: 0,
      crafting: false,
      // Server time synchronization
      serverTimeOffset: 0, // Will be calculated when receiving game state updates
    };

    this.renderer = new Renderer(
      this.ctx,
      this.gameState,
      this.mapManager,
      this.hud,
      this.merchantBuyPanel,
      this.gameOverDialog,
      this.particleManager,
      () => this.getPlacementManager(),
      () => this.getTeleportState()
    );

    this.resizeController = new ResizeController(this.renderer);
  }

  /**
   * Connect to the game server
   */
  public connectToServer(serverUrl: string): void {
    this.socketManager = new ClientSocketManager(serverUrl);
    this.clientEventListener = new ClientEventListener(this, this.socketManager);
    this.commandManager = new CommandManager(this.socketManager, this.gameState);

    // Initialize placement manager
    this.placementManager = new PlacementManager(
      this.ctx.canvas,
      this.cameraManager,
      this.mapManager,
      () => this.getMyPlayer(),
      () => this.gameState.entities,
      () => this.socketManager.getSocket()
    );

    // Set up ping display
    this.socketManager.onPing((ping) => {
      this.hud.updatePing(ping);
    });

    // Set game client reference for sound manager
    this.soundManager.setGameClient(this);

    if (DEBUG_ADMIN_COMMANDS) {
      (window as any).commandManager = this.commandManager;
    }
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

  public removeEntity(id: string) {
    removeEntityFromState(this.gameState, id);
  }

  public getSocketManager(): ClientSocketManager {
    return this.socketManager;
  }

  public getMyPlayer(): PlayerClient | null {
    return this.gameState.playerId
      ? (getEntityById(this.gameState, this.gameState.playerId) as unknown as PlayerClient)
      : null;
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

    // Disconnect from server to prevent duplicate connections
    if (this.socketManager) {
      this.socketManager.disconnect();
    }

    this.isMounted = false;
  }

  public getEntityById(id: string) {
    return getEntityById(this.gameState, id);
  }

  public start(): void {
    if (!this.isMounted || this.isStarted) {
      return;
    }

    this.isStarted = true;
    this.lastUpdateTimeMs = Date.now();

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
    const now = Date.now();
    const deltaSecondsRaw = (now - this.lastUpdateTimeMs) / 1000;
    this.lastUpdateTimeMs = now;
    // Clamp to avoid large jumps on tab switches; cap to ~20 FPS minimum
    const deltaSeconds = Math.max(0, Math.min(deltaSecondsRaw, 0.05));
    if (now - this.lastFpsUpdate >= this.FPS_UPDATE_INTERVAL) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
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
          cameraScale
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
        // This ensures client and server use the same timestep
        this.fixedTimestepSimulator.update((fixedDeltaTime) => {
          // deltaTime is always FIXED_TIMESTEP (0.05 seconds) for physics
          this.predictionManager.predictLocalPlayerMovement(
            player,
            input,
            fixedDeltaTime, // Always 0.05, matching server
            mapData.collidables,
            this.gameState.entities
          );
        });

        // Send input to server when it changed, facing direction changed, or aimAngle changed
        if (this.inputManager.getHasChanged() || facingChanged || aimAngleChanged) {
          // Get sequence number for this input
          if (!input.sequenceNumber) {
            input.sequenceNumber = this.sequenceManager.getNextSequence();
          }

          // Send input to server
          this.sendInput(input);
          this.inputManager.reset();
        }

        // After prediction, smoothly reconcile towards server's authoritative position
        reconciliationManager.reconcile(
          player,
          (player as any).serverGhostPos || player.getPosition()
        );
      }
    }

    this.positionCameraOnPlayer();
    this.updateTeleportProgress();
    this.hud.update(this.gameState);
    this.updatePlayerMovementSounds();
    this.updateCampfireSounds();
    this.updateCursorVisibility();
  }

  /**
   * Update teleport progress and send event when complete
   */
  private updateTeleportProgress(): void {
    if (!this.isTeleporting) {
      return;
    }

    const now = Date.now();
    const elapsed = now - this.teleportStartTime;
    this.teleportProgress = Math.min(1, elapsed / this.TELEPORT_DURATION);

    // If progress reaches 1.0, teleport is complete
    if (this.teleportProgress >= 1.0) {
      this.completeTeleport();
    }
  }

  /**
   * Start teleport progress
   */
  private startTeleport(): void {
    // Don't restart if already teleporting
    if (this.isTeleporting) {
      return;
    }

    // Don't start if we just cancelled due to damage (prevents immediate restart if H is still held)
    if (this.teleportCancelledByDamage) {
      return;
    }

    const player = this.getMyPlayer();
    if (!player || player.isDead()) {
      return;
    }

    // Check if player is already near the campsite
    const biomePositions = this.mapManager.getBiomePositions();
    if (biomePositions?.campsite && player.hasExt(ClientPositionable)) {
      const playerPos = player.getExt(ClientPositionable).getCenterPosition();
      // Convert biome coordinates to world coordinates (center of campsite biome)
      // Each biome is 16 tiles, and campsite is at center of map (biome 4,4)
      const BIOME_SIZE = 16;
      const campsiteBiomeX = biomePositions.campsite.x;
      const campsiteBiomeY = biomePositions.campsite.y;
      // Calculate center of campsite biome in world coordinates
      const campsiteCenterX =
        (campsiteBiomeX * BIOME_SIZE + BIOME_SIZE / 2) * getConfig().world.TILE_SIZE;
      const campsiteCenterY =
        (campsiteBiomeY * BIOME_SIZE + BIOME_SIZE / 2) * getConfig().world.TILE_SIZE;
      const poolManager = PoolManager.getInstance();
      const campsitePos = poolManager.vector2.claim(campsiteCenterX, campsiteCenterY);

      const distanceToCampsite = distance(playerPos, campsitePos);
      const TELEPORT_MIN_DISTANCE = 200; // Don't allow teleport if within 200 pixels of campsite center

      if (distanceToCampsite < TELEPORT_MIN_DISTANCE) {
        return; // Player is too close to campsite, don't allow teleport
      }
    }

    this.isTeleporting = true;
    this.teleportStartTime = Date.now();
    this.teleportProgress = 0;
    this.teleportCancelledByDamage = false; // Reset flag when starting new teleport
  }

  /**
   * Cancel teleport and reset progress
   */
  private cancelTeleport(): void {
    this.isTeleporting = false;
    this.teleportProgress = 0;
    this.teleportStartTime = 0;
    this.teleportCancelledByDamage = false; // Reset flag
  }

  /**
   * Complete teleport and send event to server
   */
  private completeTeleport(): void {
    this.isTeleporting = false;
    this.teleportProgress = 0;
    this.teleportStartTime = 0;

    // Send teleport request to server
    if (this.socketManager) {
      this.socketManager.sendTeleportToBase();
    }

    // Play explosion sound immediately (client-side feedback)
    const player = this.getMyPlayer();
    if (player && player.hasExt(ClientPositionable)) {
      const playerPosition = player.getExt(ClientPositionable).getCenterPosition();
      this.soundManager.playPositionalSound(SOUND_TYPES_TO_MP3.EXPLOSION, playerPosition);
    }
  }

  /**
   * Interrupt teleport (called when player takes damage)
   */
  public interruptTeleport(): void {
    // Cancel teleport and set flag to prevent immediate restart if H is still held
    if (this.isTeleporting) {
      this.isTeleporting = false;
      this.teleportProgress = 0;
      this.teleportStartTime = 0;
      this.teleportCancelledByDamage = true;
    }
  }

  private handleLocalInventorySlotChanged(slot: number): void {
    const player = this.getMyPlayer();
    if (player) {
      player.setLocalInventorySlot(slot);
    }
  }

  /**
   * Get teleport state for HUD rendering
   */
  public getTeleportState(): { isTeleporting: boolean; progress: number } {
    return {
      isTeleporting: this.isTeleporting,
      progress: this.teleportProgress,
    };
  }

  /**
   * Update cursor visibility based on whether player has a weapon equipped
   */
  private updateCursorVisibility(): void {
    const player = this.getMyPlayer();
    if (!player) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const inventory = player.getInventory();
    if (!inventory) {
      this.ctx.canvas.style.cursor = "default";
      return;
    }

    const input = this.inputManager.getInputs();
    const activeSlot = input.inventoryItem;
    const activeItem = inventory[activeSlot - 1];

    // Hide cursor when weapon is equipped
    const hasWeapon = activeItem && this.isWeaponItem(activeItem.itemType);
    this.ctx.canvas.style.cursor = hasWeapon ? "none" : "default";
  }

  /**
   * Update walk/run sounds for all players based on their input state
   */
  private updatePlayerMovementSounds(): void {
    const players = this.gameState.entities.filter(
      (entity) => entity instanceof PlayerClient
    ) as PlayerClient[];

    const existingPlayerIds = new Set<string>();

    players.forEach((player) => {
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
    });

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
        (this.gameState.entities.find(
          (entity) => entity instanceof CampsiteFireClient
        ) as CampsiteFireClient) || null;
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
      // Position camera at player's center to match aim angle calculation
      this.cameraManager.translateTo(playerToFollow.getExt(ClientPositionable).getCenterPosition());
    }
  }

  private getEntities(): ClientEntityBase[] {
    return this.gameState.entities;
  }

  public getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }

  /**
   * Get crafting state for React components
   */
  public getCraftingState() {
    const player = this.getMyPlayer();
    if (!player) {
      return {
        resources: { wood: 0, cloth: 0 },
        inventory: [],
        playerId: null,
      };
    }

    // Get resources from extension
    let wood = 0;
    let cloth = 0;
    if (player.hasExt(ClientResourcesBag)) {
      const resourcesBag = player.getExt(ClientResourcesBag);
      wood = resourcesBag.getWood();
      cloth = resourcesBag.getCloth();
    }

    // Safely get inventory - check if method exists (player might not be fully initialized)
    let inventory: InventoryItem[] = [];
    if (typeof player.getInventory === "function") {
      inventory = player.getInventory();
    } else if (player.hasExt(ClientInventory)) {
      // Fallback: get inventory directly from extension if method doesn't exist
      inventory = player.getExt(ClientInventory).getItems();
    }

    return {
      resources: {
        wood,
        cloth,
      },
      inventory,
      playerId: this.gameState.playerId,
    };
  }

  /**
   * Send craft request to server (for React components)
   */
  public craftRecipe(recipe: import("@shared/util/recipes").RecipeType): void {
    if (this.socketManager) {
      this.socketManager.sendCraftRequest(recipe);
    }
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
   * Check if an item type is a weapon that can be fired
   */
  private isWeaponItem(itemType: string): boolean {
    return isWeapon(itemType as ItemType);
  }
}
