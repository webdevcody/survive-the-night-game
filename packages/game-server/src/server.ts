import { GameStateEvent } from "./shared/events";
import { Entity, EntityType } from "./shared/entities";
import { Vector2 } from "./shared/physics";
import { EntityManager } from "./managers/entity-manager";
import { MapManager } from "./managers/map-manager";
import { SocketManager } from "./managers/socket-manager";

export const FPS = 30;

export type Input = {
  dx: number;
  dy: number;
  harvest: boolean;
  fire: boolean;
  inventoryItem: number;
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
    this.removeHarvestedEntities();
    this.entityManager.pruneEntities();
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  // TODO: I feel like this should live in the tree or harvestable trait itself?
  private removeHarvestedEntities(): void {
    const harvestables = this.entityManager.filterHarvestableEntities(
      this.entityManager.getEntities()
    );

    for (let i = 0; i < harvestables.length; i++) {
      const harvestable = harvestables[i];
      if (harvestable.getIsHarvested()) {
        console.log("removing harvested entity");
        this.entityManager.markEntityForRemoval(harvestable as unknown as Entity);
      }
    }
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
