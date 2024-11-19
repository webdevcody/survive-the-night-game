import { InputManager } from "./managers/input";
import { Renderable } from "./traits/renderable";
import { EntityDto, SocketManager } from "./managers/socket";
import { Entities, Entity } from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";
import { CameraManager } from "./managers/camera";
import { MapManager } from "./managers/map";

export class GameClient {
  private entities: Entity[] = [];
  private ctx: CanvasRenderingContext2D;
  private socketManager: SocketManager;
  private inputManager;
  private cameraManager: CameraManager;
  private mapManager: MapManager;
  private latestEntities: EntityDto[] = [];

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.cameraManager = new CameraManager(this.ctx);

    this.mapManager = new MapManager();

    this.socketManager = new SocketManager(serverUrl, {
      onGameStateUpdate: (entities: EntityDto[]) => {
        this.latestEntities = entities;
      },
      onEntityRemoval: (id: string) => {
        const index = this.entities.findIndex((e) => e.getId() === id);
        if (index !== -1) {
          this.entities.splice(index, 1);
        }
      },
    });

    this.inputManager = new InputManager();

    this.startRenderLoop();
  }

  public sendInput(input: { dx: number; dy: number }): void {
    this.socketManager.sendInput(input);
  }

  public getPlayerById(id: string): PlayerClient | undefined {
    return this.entities.find((e) => e.getId() === id) as PlayerClient;
  }

  private updateEntities(): void {
    for (const entityData of this.latestEntities) {
      const existingEntity = this.entities.find(
        (e) => e.getId() === entityData.id
      );

      if (existingEntity) {
        Object.assign(existingEntity, entityData);
        continue;
      }

      if (entityData.type === Entities.PLAYER) {
        const player = new PlayerClient(entityData.id);
        player.setPosition(entityData.position);
        this.entities.push(player);
        continue;
      } else {
        console.warn("Unknown entity type", entityData);
      }
    }
  }

  private update(): void {
    if (this.inputManager.getHasChanged()) {
      this.sendInput(this.inputManager.getInputs());
    }

    this.updateEntities();

    this.positionCameraOnPlayer();
  }

  private positionCameraOnPlayer(): void {
    const playerId = this.socketManager.getId();

    if (!playerId) {
      return;
    }

    const playerToFollow = this.getPlayerById(playerId);

    if (playerToFollow) {
      this.cameraManager.translateTo(playerToFollow.getPosition());
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      this.update();
      this.render();
      requestAnimationFrame(render);
    };
    render();
  }

  private getRenderableEntities(): Renderable[] {
    return this.entities.filter((entity) => {
      return "render" in entity;
    }) as Renderable[];
  }

  private clearCanvas(): void {
    const { width, height } = this.ctx.canvas;
    const transform = this.ctx.getTransform();
    const offsetX = -transform.e;
    const offsetY = -transform.f;
    // this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(offsetX, offsetY, width * 2, height * 2);
  }

  private renderEntities(): void {
    const renderableEntities = this.getRenderableEntities();

    renderableEntities.forEach((entity) => {
      entity.render(this.ctx);
    });
  }

  private render(): void {
    this.clearCanvas();
    this.mapManager.render(this.ctx);
    this.renderEntities();
  }
}
