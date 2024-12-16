import { AssetManager } from "./managers/asset";
import { InputManager } from "./managers/input";
import { EntityDto, SocketManager } from "./managers/socket";
import {
  Direction,
  Entities,
  EntityType,
  GameStateEvent,
  Input,
  PositionableTrait,
} from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";
import { ZombieClient } from "./entities/zombie";
import { CameraManager } from "./managers/camera";
import { MapManager } from "./managers/map";
import { TreeClient } from "./entities/tree";
import { GameState, getEntityById } from "./state";
import { IClientEntity, Renderable } from "./entities/util";
import { Hotbar } from "./ui/hotbar";
import { CraftingTable } from "./ui/crafting-table";
import { BulletClient } from "./entities/bullet";
import { StorageManager } from "./managers/storage";
import { WallClient } from "./entities/wall";
import { Hud } from "./ui/hud";
import { WeaponClient } from "./entities/weapon";
import { BandageClient } from "./entities/items/bandage";
import { ClothClient } from "./entities/items/cloth";
import { SoundClient } from "./entities/sound";

export class GameClient {
  private ctx: CanvasRenderingContext2D;
  private assetManager = new AssetManager();
  private socketManager: SocketManager;
  private inputManager: InputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private latestEntities: EntityDto[] = [];
  private gameState: GameState;
  private hud: Hud;
  private craftingTable: CraftingTable;
  private scale: number;
  private unmountQueue: Function[] = [];
  private reqId: number | null = null;
  private running = false;
  private mounted = true;
  private hotbar: Hotbar;

  private entityFactories: Record<EntityType, (entityData: EntityDto) => IClientEntity> = {
    [Entities.PLAYER]: (data) => {
      const entity = new PlayerClient(data.id, this.assetManager);
      this.initializeEntity(entity, data);
      return entity;
    },
    [Entities.TREE]: (data) => {
      const entity = new TreeClient(data.id, this.assetManager);
      entity.deserialize(data);
      return entity;
    },
    [Entities.BULLET]: (data) => {
      const entity = new BulletClient(data.id, this.assetManager);
      this.initializeEntity(entity, data);
      return entity;
    },
    [Entities.WALL]: (data) => {
      const entity = new WallClient(data.id, this.assetManager);
      this.initializeEntity(entity, data);
      return entity;
    },
    [Entities.WEAPON]: (data) => {
      const entity = new WeaponClient(data.id, this.assetManager, data.weaponType);
      entity.deserialize(data);
      return entity;
    },
    [Entities.BANDAGE]: (data) => {
      const entity = new BandageClient(data.id, this.assetManager);
      entity.deserialize(data);
      return entity;
    },
    [Entities.CLOTH]: (data) => {
      const entity = new ClothClient(data.id, this.assetManager);
      entity.deserialize(data);
      return entity;
    },
    [Entities.ZOMBIE]: (data) => {
      const entity = new ZombieClient(data.id, this.assetManager);
      this.initializeEntity(entity, data);
      return entity;
    },
    [Entities.SOUND]: (data) => {
      const entity = new SoundClient(data.id, data.soundType);
      this.initializeEntity(entity, data);
      return entity;
    },
  };

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
        this.latestEntities = gameStateEvent.getPayload().entities;
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

  private initializeEntity(entity: IClientEntity, data: EntityDto): void {
    Object.assign(entity, data);
  }

  private updateEntities(): void {
    // remove dead entities
    for (let i = 0; i < this.getEntities().length; i++) {
      const entity = this.getEntities()[i];
      if (!this.latestEntities.find((e) => e.id === entity.getId())) {
        this.getEntities().splice(i, 1);
        i--;
      }
    }

    // add new / update entities
    for (const entityData of this.latestEntities) {
      const existingEntity = this.getEntities().find((e) => e.getId() === entityData.id);

      if (existingEntity) {
        if ("deserialize" in existingEntity) {
          existingEntity.deserialize(entityData);
        } else {
          Object.assign(existingEntity, entityData);
        }

        continue;
      }

      const factory = this.entityFactories[entityData.type];
      if (factory) {
        const entity = factory(entityData);
        this.getEntities().push(entity);
      } else {
        console.warn("Unknown entity type", entityData);
      }
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
