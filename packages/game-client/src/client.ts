import { AssetManager } from "./managers/asset";
import { InputManager } from "./managers/input";
import { EntityDto, SocketManager } from "./managers/socket";
import { Entities, GameStateEvent, Positionable } from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";
import { ZombieClient } from "./entities/zombie";
import { CameraManager } from "./managers/camera";
import { InventoryManager } from "./managers/inventory";
import { MapManager } from "./managers/map";
import { TreeClient } from "./entities/tree";
import { GameState, getEntityById } from "./state";
import { IClientEntity, Renderable } from "./entities/util";
import { HotbarClient } from "./ui/hotbar";
import { BulletClient } from "./entities/bullet";
import { StorageManager } from "./managers/storage";
import { WallClient } from "./entities/wall";

export class GameClient {
  private ctx: CanvasRenderingContext2D;
  private assetManager = new AssetManager();
  private socketManager: SocketManager;
  private inputManager: InputManager;
  private inventoryManager: InventoryManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private storageManager: StorageManager;
  private latestEntities: EntityDto[] = [];
  private gameState: GameState;
  private scale: number;
  private unmountQueue: Function[] = [];
  private reqId: number | null = null;
  private running = false;
  private mounted = true;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    this.setupCanvas();
    this.addBrowserListeners();

    this.storageManager = new StorageManager();
    this.scale = this.storageManager.getScale(4);

    this.cameraManager = new CameraManager(this.ctx);
    this.cameraManager.setScale(this.scale);

    this.mapManager = new MapManager();
    this.inputManager = new InputManager();
    this.inventoryManager = new InventoryManager(this.inputManager);

    this.gameState = {
      playerId: "",
      hotbar: new HotbarClient(this.assetManager, this.inputManager, this.inventoryManager),
      entities: [],
    };

    this.socketManager = new SocketManager(serverUrl, {
      onGameStateUpdate: (gameStateEvent: GameStateEvent) => {
        this.latestEntities = gameStateEvent.getPayload().entities;
      },
      onYourId: (playerId: string) => {
        this.gameState.playerId = playerId;
      },
    });
  }

  public async loadAssets() {
    await this.assetManager.load();
  }

  public sendInput(input: { dx: number; dy: number; harvest: boolean; fire: boolean }): void {
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
      if (!this.latestEntities.find((e) => e.id === entity.getId())) {
        this.getEntities().splice(i, 1);
        i--;
      }
    }

    // add new / update entities
    for (const entityData of this.latestEntities) {
      const existingEntity = this.getEntities().find((e) => e.getId() === entityData.id);

      if (existingEntity) {
        if (entityData.velocity && "setVelocity" in existingEntity) {
          existingEntity.setVelocity(entityData.velocity);
        }
        Object.assign(existingEntity, entityData);
        continue;
      }

      // TODO: consider a better way to handle this
      if (entityData.type === Entities.PLAYER) {
        const player = new PlayerClient(entityData.id, this.assetManager, this.inventoryManager);
        player.setPosition(entityData.position);
        if (entityData.velocity) {
          player.setVelocity(entityData.velocity);
        }
        this.getEntities().push(player);
        continue;
      } else if (entityData.type === Entities.TREE) {
        const tree = new TreeClient(entityData.id, this.assetManager);
        tree.setPosition(entityData.position);
        this.getEntities().push(tree);
        continue;
      } else if (entityData.type === Entities.BULLET) {
        const bullet = new BulletClient(entityData.id, this.assetManager);
        bullet.setPosition(entityData.position);
        this.getEntities().push(bullet);
        continue;
      } else if (entityData.type === Entities.WALL) {
        const wall = new WallClient(entityData.id, this.assetManager);
        wall.setPosition(entityData.position);
        this.getEntities().push(wall);
        continue;
      } else if (entityData.type === Entities.ZOMBIE) {
        const zombie = new ZombieClient(entityData.id, this.assetManager);
        zombie.setPosition(entityData.position);
        if (entityData.velocity) {
          zombie.setVelocity(entityData.velocity);
        }
        this.getEntities().push(zombie);
        continue;
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
  }

  private positionCameraOnPlayer(): void {
    const playerId = this.gameState.playerId;

    if (!playerId) {
      return;
    }

    const playerToFollow = getEntityById(this.gameState, playerId) as Positionable | undefined;

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

  private renderHotbar(): void {
    this.gameState.hotbar.render(this.ctx, this.gameState);
  }

  private render(): void {
    this.clearCanvas();
    this.mapManager.render(this.ctx);
    this.renderEntities();
    this.renderHotbar();
  }
}
