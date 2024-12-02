import { Direction } from "./shared/direction";
import { GameStateEvent } from "./shared/events";
import { Entity, EntityType } from "./shared/entities";
import { Vector2 } from "./shared/physics";
import { EntityManager } from "./managers/entity-manager";
import { MapManager } from "./managers/map-manager";
import { SocketManager } from "./managers/socket-manager";

export const FPS = 30;

export type Input = {
  facing: Direction;
  dx: number;
  dy: number;
  harvest: boolean;
  fire: boolean;
  inventoryItem: number;
  drop: boolean;
};

class GameServer {
  private lastUpdateTime: number = Date.now();
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: SocketManager;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(port: number = 3001) {
    this.entityManager = new EntityManager();
    this.mapManager = new MapManager(this.entityManager);
    this.mapManager.loadMap("testing");
    this.socketManager = new SocketManager(this.entityManager, this.mapManager, port);
    this.startGameLoop();
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private startGameLoop(): void {
    this.timer = setInterval(() => {
      this.update();
    }, 1000 / FPS);
  }

  private update(): void {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.updateEntities(deltaTime);
    this.entityManager.pruneEntities();
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  private updateEntities(deltaTime: number): void {
    for (const entity of this.entityManager.getUpdatableEntities()) {
      entity.update(deltaTime);
    }
  }

  // TODO: This is a bit of a hack to get the game state to the client.
  // We should probably have a more elegant way to do this.
  private broadcastGameState(): void {
    const rawEntities = [...this.entityManager.getEntities()].map((entity) => entity.serialize());
    const gameStateEvent = new GameStateEvent({ entities: rawEntities });
    this.socketManager.broadcastEvent(gameStateEvent);
  }
}

const gameServer = new GameServer();

process.on("SIGINT", () => gameServer.stop());
