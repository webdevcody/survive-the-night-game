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

export const DAY_DURATION = 10;
export const NIGHT_DURATION = 10;

class GameServer {
  private lastUpdateTime: number = Date.now();
  private entityManager: EntityManager;
  private mapManager: MapManager;
  private socketManager: SocketManager;
  private timer: ReturnType<typeof setInterval> | null = null;
  private dayNumber: number = 1;
  private untilNextCycle: number = 0;
  private isDay: boolean = true;

  constructor(port: number = 3001) {
    this.entityManager = new EntityManager();
    this.mapManager = new MapManager(this.entityManager);
    this.mapManager.loadMap("testing");
    this.socketManager = new SocketManager(this.entityManager, this.mapManager, port);
    this.untilNextCycle = DAY_DURATION;
    this.isDay = true;
    this.dayNumber = 1;
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

  private onDayStart(): void {
    console.log("Day started");
  }

  private onNightStart(): void {
    console.log("Night started");
  }

  private update(): void {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;

    this.untilNextCycle -= deltaTime;
    if (this.untilNextCycle <= 0) {
      this.isDay = !this.isDay;
      this.untilNextCycle = this.isDay ? DAY_DURATION : NIGHT_DURATION;
      this.dayNumber += this.isDay ? 1 : 0;

      if (this.isDay) {
        this.onDayStart();
      } else {
        this.onNightStart();
      }
    }
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
    const gameStateEvent = new GameStateEvent({
      entities: rawEntities,
      dayNumber: this.dayNumber,
      untilNextCycle: this.untilNextCycle,
      isDay: this.isDay,
    });
    this.socketManager.broadcastEvent(gameStateEvent);
  }
}

const gameServer = new GameServer();

process.on("SIGINT", () => gameServer.stop());
