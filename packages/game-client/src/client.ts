import { io, Socket } from "socket.io-client";
import { InputManager } from "./managers/input";
import { Entity } from "./entities/entity";
import { Renderable } from "./traits/renderable";
import { SocketManager } from "./managers/socket";

export class GameClient {
  private entities: Entity[] = [];
  private ctx: CanvasRenderingContext2D;
  private socketManager: SocketManager;
  private inputManager;

  constructor(serverUrl: string, canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    this.socketManager = new SocketManager(serverUrl, {
      onGameStateUpdate: (entities: Entity[]) => {
        this.entities = entities;
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
