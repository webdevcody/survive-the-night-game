import { AssetManager } from "./managers/asset";
import { InputManager } from "./managers/input";
import { EntityDto, SocketManager } from "./managers/socket";
import {
  Direction,
  Entities,
  GameStateEvent,
  Input,
  PositionableTrait,
} from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";
import { CameraManager } from "./managers/camera";
import { MapManager } from "./managers/map";
import { GameState, getEntityById } from "./state";
import { IClientEntity, Renderable } from "./entities/util";
import { Hotbar } from "./ui/hotbar";
import { CraftingTable } from "./ui/crafting-table";
import { StorageManager } from "./managers/storage";
import { Hud } from "./ui/hud";
import { EntityFactory } from "./entities/entity-factory";

export class GameClient {
  private ctx: CanvasRenderingContext2D;
  private assetManager = new AssetManager();
  private socketManager: SocketManager;
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private entitiesFromServer: EntityDto[] = [];
  private gameState: GameState;
  private hud: Hud;
  private craftingTable: CraftingTable;
  private scale: number;
  private unmountQueue: Function[] = [];
  private reqId: number | null = null;
  private running = false;
  private mounted = true;
  private hotbar: Hotbar;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.setupCanvas();
    this.addBrowserListeners();

    this.storageManager = new StorageManager();
    this.scale = this.storageManager.getScale(4);

    this.cameraManager = new CameraManager(this.ctx);
    this.cameraManager.setScale(this.scale);

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

    this.socketManager = new SocketManager(serverUrl, {
      onMap: (map: number[][]) => {
        this.mapManager.setMap(map);
      },
      onGameStateUpdate: (gameStateEvent: GameStateEvent) => {
        this.entitiesFromServer = gameStateEvent.getPayload().entities;
        this.gameState.dayNumber = gameStateEvent.getPayload().dayNumber;
        this.gameState.untilNextCycle = gameStateEvent.getPayload().untilNextCycle;
        this.gameState.isDay = gameStateEvent.getPayload().isDay;
      },
      onYourId: (playerId: string) => {
        this.gameState.playerId = playerId;
      },
      onPlayerDeath: (playerId: string) => {
        this.hud.showPlayerDeath(playerId);
      },
    });
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
    this.unmountQueue.forEach((cb) => cb());
    this.mounted = false;
  }

  public zoomIn() {
    this.zoom(+1);
  }

  public zoomOut() {
    this.zoom(-1);
  }

  public start(): void {
    if (!this.mounted || this.running) {
      return;
    }

    this.running = true;

    const tick = () => {
      this.update();
      this.render();
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

  private addBrowserListeners() {
    const handleResize = () => this.setupCanvas();
    window.addEventListener("resize", handleResize);
    this.unmountQueue.push(() => window.removeEventListener("resize", handleResize));
  }

  private zoom(amount: number) {
    this.scale += amount;
    this.storageManager.setScale(this.scale);
    this.cameraManager.setScale(this.scale);
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
          Object.assign(existingEntity, entityData);
        }

        continue;
      }

      const factory = new EntityFactory(this.assetManager);
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

  private getRenderableEntities(): Renderable[] {
    return this.getEntities().filter((entity) => {
      return "render" in entity;
    }) as Renderable[];
  }

  private setupCanvas(): void {
    this.ctx.canvas.width = window.innerWidth * window.devicePixelRatio;
    this.ctx.canvas.height = window.innerHeight * window.devicePixelRatio;
    this.ctx.canvas.style.width = `${window.innerWidth}px`;
    this.ctx.canvas.style.height = `${window.innerHeight}px`;

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private clearCanvas(): void {
    const { width, height } = this.ctx.canvas;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.restore();
  }

  private getEntities(): IClientEntity[] {
    return this.gameState.entities;
  }

  private renderEntities(): void {
    const renderableEntities = this.getRenderableEntities();

    renderableEntities.sort((a, b) => a.getZIndex() - b.getZIndex());

    renderableEntities.forEach((entity) => {
      entity.render(this.ctx, this.gameState);
    });
  }

  private render(): void {
    this.clearCanvas();
    this.mapManager.render(this.ctx);
    this.renderEntities();

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (!this.gameState.isDay) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }

    this.hotbar.render(this.ctx, this.gameState);
    this.hud.render(this.ctx, this.gameState);
    this.craftingTable.render(this.ctx, this.gameState);
  }
}
