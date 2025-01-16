import { AssetManager } from "./managers/asset";
import { InputManager } from "./managers/input";
import { EntityDto, ClientSocketManager } from "./managers/client-socket-manager";
import { PlayerClient } from "./entities/player";
import { CameraManager } from "./managers/camera";
import { MapManager } from "./managers/map";
import { GameState, getEntityById } from "./state";
import { IClientEntity } from "./entities/util";
import { InventoryBarUI } from "./ui/inventory-bar";
import { CraftingTable } from "./ui/crafting-table";
import { StorageManager } from "./managers/storage";
import { Hud } from "./ui/hud";
import { EntityFactory } from "./entities/entity-factory";
import { Renderer } from "./renderer";
import { ZoomController } from "./zoom-controller";
import { ResizeController } from "./resize-controller";
import { ClientEventListener } from "./client-event-listener";
import { SoundManager } from "./managers/sound-manager";
import { GameOverDialogUI } from "./ui/game-over-dialog";
import { CommandManager } from "./managers/command-manager";
import { DEBUG_ADMIN_COMMANDS } from "../../game-shared/src/debug";
import { Direction } from "@shared/geom/direction";
import { Input } from "@shared/geom/input";

export class GameClient {
  private ctx: CanvasRenderingContext2D;

  // Managers
  private assetManager: AssetManager;
  private socketManager: ClientSocketManager;
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private soundManager: SoundManager;
  private commandManager: CommandManager;
  private clientEventListener: ClientEventListener;

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
  private updatedEntitiesBuffer: EntityDto[] = [];
  private animationFrameId: number | null = null;
  private isStarted = false;
  private isMounted = true;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    this.assetManager = new AssetManager();
    this.storageManager = new StorageManager();
    this.cameraManager = new CameraManager(this.ctx);
    this.zoomController = new ZoomController(this.storageManager, this.cameraManager);
    this.soundManager = new SoundManager(this);

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
    this.hud = new Hud();
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
      untilNextCycle: 0,
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
      this.gameOverDialog
    );

    this.resizeController = new ResizeController(this.renderer);

    this.socketManager = new ClientSocketManager(serverUrl);
    this.clientEventListener = new ClientEventListener(this, this.socketManager);
    this.commandManager = new CommandManager(this.socketManager, this.gameState);

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

  public getSocketManager(): ClientSocketManager {
    return this.socketManager;
  }

  public getMyPlayer(): PlayerClient | null {
    return this.gameState.playerId
      ? (getEntityById(this.gameState, this.gameState.playerId) as unknown as PlayerClient)
      : null;
  }

  public setUpdatedEntitiesBuffer(entities: EntityDto[]) {
    this.updatedEntitiesBuffer = entities;
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

  public unmount() {
    if (!this.isMounted) {
      return;
    }

    this.stop();
    this.resizeController.cleanUp();
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

  // TODO: clean this up with delta compression and a different approach for new / old entities
  private updateEntities(): void {
    // remove dead entities
    for (let i = 0; i < this.getEntities().length; i++) {
      const entity = this.getEntities()[i];
      if (!this.updatedEntitiesBuffer.find((e) => e.id === entity.getId())) {
        this.getEntities().splice(i, 1);
        i--;
      }
    }

    // EXISTING ENTITIES
    for (const entityData of this.updatedEntitiesBuffer) {
      const existingEntity = this.getEntities().find((e) => e.getId() === entityData.id);

      if (existingEntity) {
        (existingEntity as any).deserialize(entityData);
        continue;
      }

      // NEW ENTITY HERE
      const factory = new EntityFactory(this.assetManager);
      const entity = factory.createEntity(entityData);
      this.getEntities().push(entity);
    }
  }

  private update(): void {
    if (this.inputManager.getHasChanged()) {
      this.sendInput(this.inputManager.getInputs());
      this.inputManager.reset();
    }

    this.updateEntities();

    this.positionCameraOnPlayer();

    this.hud.update(this.gameState);
  }

  private positionCameraOnPlayer(): void {
    const playerToFollow = this.getMyPlayer() as PlayerClient | undefined;

    if (playerToFollow) {
      this.cameraManager.translateTo(playerToFollow.getPosition());
    }
  }

  private getEntities(): IClientEntity[] {
    return this.gameState.entities;
  }
}
