import { AssetManager, ImageLoader } from "@/managers/asset";
import { InputManager } from "@/managers/input";
import { ClientSocketManager } from "@/managers/client-socket-manager";
import { PlayerClient } from "@/entities/player";
import { CameraManager } from "@/managers/camera";
import { MapManager } from "@/managers/map";
import { GameState, getEntityById } from "@/state";
import { InventoryBarUI } from "@/ui/inventory-bar";
import { CraftingTable } from "@/ui/crafting-table";
import { StorageManager } from "@/managers/storage";
import { Hud } from "@/ui/hud";
import { EntityFactory } from "@/entities/entity-factory";
import { Renderer } from "@/renderer";
import { ZoomController } from "@/zoom-controller";
import { ResizeController } from "@/resize-controller";
import { ClientEventListener } from "@/client-event-listener";
import { SoundManager } from "@/managers/sound-manager";
import { GameOverDialogUI } from "@/ui/game-over-dialog";
import { CommandManager } from "@/managers/command-manager";
import { DEBUG_ADMIN_COMMANDS } from "@shared/debug";
import { Direction } from "../../game-shared/src/util/direction";
import { Input } from "../../game-shared/src/util/input";
import { ClientEntityBase } from "@/extensions/client-entity";
import { ClientDestructible } from "@/extensions/destructible";
import { ParticleManager } from "./managers/particles";
import { PredictionManager } from "./managers/prediction";

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
  private craftingTable: CraftingTable;
  private hotbar: InventoryBarUI;
  private gameOverDialog: GameOverDialogUI;

  // State
  private gameState: GameState;
  private animationFrameId: number | null = null;
  private isStarted = false;
  private isMounted = true;

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

    // Add click event listener for UI interactions
    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();

      // Convert CSS coordinates to canvas coordinates
      // This accounts for any CSS scaling of the canvas
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Handle HUD clicks (like mute button)
      if (this.hud) {
        this.hud.handleClick(x, y, canvas.height);
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
    this.hud = new Hud(this.mapManager, this.soundManager, this.assetManager);
    this.gameOverDialog = new GameOverDialogUI();

    // TODO: refactor to use event emitter
    this.craftingTable = new CraftingTable(this.assetManager, {
      getInventory,
      getPlayer,
      onCraft: (recipe) => {
        this.socketManager.sendCraftRequest(recipe);
        this.gameState.crafting = false;
      },
    });

    // TODO: refactor to use event emitter
    this.inputManager = new InputManager({
      onCraft: () => {
        const player = getPlayer();

        if (player?.isDead()) {
          return;
        }

        this.craftingTable.reset();
        this.gameState.crafting = !this.craftingTable.isVisible();

        if (this.gameState.crafting) {
          this.socketManager.sendStartCrafting();
        } else {
          this.socketManager.sendStopCrafting();
        }
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
      onDown: (inputs: Input) => {
        if (this.craftingTable.isVisible()) {
          this.craftingTable.onDown();
        } else {
          inputs.dy = 1;
          inputs.facing = Direction.Down;
        }
      },
      onRight: (inputs: Input) => {
        if (!this.craftingTable.isVisible()) {
          inputs.dx = 1;
          inputs.facing = Direction.Right;
        }
      },
      onLeft: (inputs: Input) => {
        if (!this.craftingTable.isVisible()) {
          inputs.dx = -1;
          inputs.facing = Direction.Left;
        }
      },
      onInteract: (inputs: Input) => {
        if (!this.craftingTable.isVisible()) {
          inputs.interact = true;
        }
      },
      onDrop: (inputs: Input) => {
        if (!this.craftingTable.isVisible()) {
          inputs.drop = true;
        }
      },
      onFire: (inputs: Input) => {
        if (this.craftingTable.isVisible()) {
          this.craftingTable.onSelect();
        }
        if (!this.craftingTable.isVisible()) {
          inputs.fire = true;
        }
      },
      onUp: (inputs: Input) => {
        if (this.craftingTable.isVisible()) {
          this.craftingTable.onUp();
        } else {
          inputs.dy = -1;
          inputs.facing = Direction.Up;
        }
      },
    });

    this.hotbar = new InventoryBarUI(this.assetManager, this.inputManager, getInventory);

    this.gameState = {
      startedAt: Date.now(),
      playerId: "",
      entities: [],
      dayNumber: 0,
      cycleStartTime: Date.now(),
      cycleDuration: 60, // Default to 60 seconds until we get the real value from server
      isDay: true,
      crafting: false,
    };

    this.renderer = new Renderer(
      this.ctx,
      this.gameState,
      this.mapManager,
      this.hotbar,
      this.hud,
      this.craftingTable,
      this.gameOverDialog,
      this.particleManager
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
    const index = this.gameState.entities.findIndex((entity) => entity.getId() === id);
    if (index !== -1) {
      this.gameState.entities.splice(index, 1);
    }
  }

  public getSocketManager(): ClientSocketManager {
    return this.socketManager;
  }

  public getMyPlayer(): PlayerClient | null {
    return this.gameState.playerId
      ? (getEntityById(this.gameState, this.gameState.playerId) as unknown as PlayerClient)
      : null;
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

    // Predict local player movement every frame for responsiveness
    const player = this.getMyPlayer();
    if (player) {
      const input = this.inputManager.getInputs();
      const mapData = this.mapManager.getMapData();

      // Only predict movement and send input if player is alive
      const isAlive = !player.hasExt(ClientDestructible) || !player.getExt(ClientDestructible).isDead();

      if (isAlive) {
        this.predictionManager.predictLocalPlayerMovement(
          player,
          input,
          deltaSeconds,
          mapData.collidables,
          this.gameState.entities
        );

        // After prediction, smoothly lerp towards server's authoritative position
        this.predictionManager.reconcileWithServerPosition(player);

        // Only send input to server when it actually changed
        if (this.inputManager.getHasChanged()) {
          this.sendInput(this.inputManager.getInputs());
          this.inputManager.reset();
        }
      }
    }

    this.positionCameraOnPlayer();
    this.hud.update(this.gameState);
  }

  private positionCameraOnPlayer(): void {
    const playerToFollow = this.getMyPlayer() as PlayerClient | undefined;

    if (playerToFollow) {
      this.cameraManager.translateTo(playerToFollow.getPosition());
    }
  }

  private getEntities(): ClientEntityBase[] {
    return this.gameState.entities;
  }

  public getEntityFactory(): EntityFactory {
    return this.entityFactory;
  }
}
