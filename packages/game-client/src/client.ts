import { InputManager } from "./managers/input";
import { Renderable } from "./traits/renderable";
import { EntityDto, SocketManager } from "./managers/socket";
import { Entities, Entity } from "@survive-the-night/game-server";
import { PlayerClient } from "./entities/player";

export class GameClient {
  private entities: Entity[] = [];
  private ctx: CanvasRenderingContext2D;
  private socketManager: SocketManager;
  private inputManager;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    this.socketManager = new SocketManager(serverUrl, {
      onGameStateUpdate: (entities: EntityDto[]) => {
        for (const entityData of entities) {
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

  private update(): void {
    if (this.inputManager.getHasChanged()) {
      this.sendInput(this.inputManager.getInputs());
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
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.fillRect(0, 0, width, height);
  }

  private renderEntities(): void {
    const renderableEntities = this.getRenderableEntities();

    renderableEntities.forEach((entity) => {
      entity.render(this.ctx);
    });
  }

  private render(): void {
    this.clearCanvas();
    this.renderEntities();
  }
}
