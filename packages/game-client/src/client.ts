import { AssetManager } from "./managers/asset";
import { InputManager } from "./managers/input";
import { EntityDto, ClientSocketManager } from "./managers/client-socket-manager";
import {
  Direction,
  GameStateEvent,
  Input,
  MapEvent,
  PlayerDeathEvent,
  PositionableTrait,
  ServerSentEvents,
  YourIdEvent,
} from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";
import { CameraManager } from "./managers/camera";
import { MapManager } from "./managers/map";
import { GameState, getEntityById } from "./state";
import { IClientEntity } from "./entities/util";
import { Hotbar } from "./ui/hotbar";
import { CraftingTable } from "./ui/crafting-table";
import { StorageManager } from "./managers/storage";
import { Hud } from "./ui/hud";
import { EntityFactory } from "./entities/entity-factory";
import { Renderer } from "./renderer";
import { ZoomController } from "./zoom-controller";
import { ResizeController } from "./resize-controller";

export class GameClient {
  private ctx: CanvasRenderingContext2D;
  private assetManager = new AssetManager();
  private socketManager: ClientSocketManager;
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private zoomController: ZoomController;
  private entitiesFromServer: EntityDto[] = [];
  private gameState: GameState;
  private hud: Hud;
  private craftingTable: CraftingTable;
  private resizeController: ResizeController;
  private renderer: Renderer;
  private reqId: number | null = null;
  private running = false;
  private mounted = true;
  private hotbar: Hotbar;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    this.storageManager = new StorageManager();
    this.cameraManager = new CameraManager(this.ctx);
    this.zoomController = new ZoomController(this.storageManager, this.cameraManager);

    const getInventory = () => {
      if (this.gameState.playerId) {
        const player = getEntityById(
          this.gameState,
          this.gameState.playerId
        ) as unknown as PlayerClient;
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

    this.mapManager = new MapManager();
    this.hud = new Hud();

    this.craftingTable = new CraftingTable(this.assetManager, {
      getInventory,
      getPlayer,
      onCraft: (recipe) => {
        this.socketManager.sendCraftRequest(recipe);
        this.gameState.crafting = false;
      },
    });

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

    this.hotbar = new Hotbar(this.assetManager, this.inputManager, getInventory);

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
      this.craftingTable
    );

    this.resizeController = new ResizeController(this.renderer);

    this.socketManager = new ClientSocketManager(serverUrl);

    this.socketManager.on(ServerSentEvents.GAME_STATE_UPDATE, (gameStateEvent: GameStateEvent) => {
      this.entitiesFromServer = gameStateEvent.getGameState().entities;
      this.gameState.dayNumber = gameStateEvent.getGameState().dayNumber;
      this.gameState.untilNextCycle = gameStateEvent.getGameState().untilNextCycle;
      this.gameState.isDay = gameStateEvent.getGameState().isDay;
    });

    this.socketManager.on(ServerSentEvents.PLAYER_DEATH, (playerDeathEvent: PlayerDeathEvent) => {
      this.hud.showPlayerDeath(playerDeathEvent.getPlayerId());
    });

    this.socketManager.on(ServerSentEvents.MAP, (mapEvent: MapEvent) => {
      this.mapManager.setMap(mapEvent.getMap());
    });

    this.socketManager.on(ServerSentEvents.YOUR_ID, (yourIdEvent: YourIdEvent) => {
      this.gameState.playerId = yourIdEvent.getPlayerId();
    });
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
    if (!this.mounted) {
      return;
    }

    this.stop();
    this.resizeController.cleanUp();
    this.mounted = false;
  }

  public start(): void {
    if (!this.mounted || this.running) {
      return;
    }

    this.running = true;

    const tick = () => {
      this.update();
      this.renderer.render();
      this.reqId = requestAnimationFrame(tick);
    };

    tick();
  }

  public stop(): void {
    if (!this.running) {
      return;
    }

    if (this.reqId) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }

    this.running = false;
  }

  private updateEntities(): void {
    // remove dead entities
    for (let i = 0; i < this.getEntities().length; i++) {
      const entity = this.getEntities()[i];
      if (!this.entitiesFromServer.find((e) => e.id === entity.getId())) {
        this.getEntities().splice(i, 1);
        i--;
      }
    }

    // add new / update entities
    for (const entityData of this.entitiesFromServer) {
      const existingEntity = this.getEntities().find((e) => e.getId() === entityData.id);

      if (existingEntity) {
        if ("deserialize" in existingEntity) {
          existingEntity.deserialize(entityData);
        } else {
          // TODO: this will go awaya when we refactor all entities to use ECS
          Object.assign(existingEntity, entityData);
        }

        continue;
      }

      const factory = new EntityFactory(this.assetManager, this.gameState);
      const entity = factory.createEntity(entityData.type, entityData);
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
    const playerId = this.gameState.playerId;

    if (!playerId) {
      return;
    }

    const playerToFollow = getEntityById(this.gameState, playerId) as PositionableTrait | undefined;

    if (playerToFollow) {
      this.cameraManager.translateTo(playerToFollow.getPosition());
    }
  }

  private getEntities(): IClientEntity[] {
    return this.gameState.entities;
  }
}
