import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Player } from "./shared/entities/player";
import { Events } from "./shared/events";
import { Entities, Entity } from "./shared/entities";
import { Tree } from "./shared/entities/tree";
import { distance, Vector2 } from "./shared/physics";
import { Harvestable, Positionable, Updatable } from "./shared/traits";
import { EntityManager } from "./managers/entity-manager";

export const FPS = 30;

export type Input = {
  dx: number;
  dy: number;
  harvest: boolean;
  fire: boolean;
};

class GameServer {
  private io: Server;
  private players: Map<string, Player> = new Map();
  private lastUpdateTime: number = Date.now();
  private entityManager: EntityManager;

  constructor(port: number = 3001) {
    const httpServer = createServer();
    this.io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    this.setupSocketHandlers();
    httpServer.listen(port);

    this.entityManager = new EntityManager();
    const tree = new Tree(this.entityManager);
    tree.setPosition({ x: 100, y: 50 });
    this.entityManager.addEntity(tree);

    this.startGameLoop();
  }

  private getPositionableEntities() {
    return this.entityManager.getEntities().filter((entity) => {
      return "getPosition" in entity;
    }) as unknown as Positionable[];
  }

  private filterHarvestableEntities(entities: Entity[]): Harvestable[] {
    return entities.filter((entity) => {
      return "harvest" in entity;
    }) as unknown as Harvestable[];
  }

  public getNearbyEntities(position: Vector2, radius: number): Entity[] {
    return this.getPositionableEntities().filter((entity) => {
      return distance(entity.getPosition(), position) <= radius;
    }) as unknown as Entity[];
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);

      const player = new Player(this.entityManager);
      this.players.set(socket.id, player);
      socket.emit(Events.YOUR_ID, player.getId());

      socket.on("playerInput", (input: Input) => {
        const player = this.players.get(socket.id);
        if (player) {
          player.setVelocityFromInput(input.dx, input.dy);
          player.setInput(input);

          if (input.harvest) {
            const nearbyEntities = this.getNearbyEntities(player.getPosition(), 10);
            const harvestableEntities = this.filterHarvestableEntities(nearbyEntities);
            const first = harvestableEntities[0];
            if (first) {
              first.harvest();
            }
          }
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        this.players.delete(socket.id);
      });
    });
  }

  private startGameLoop(): void {
    setInterval(() => {
      this.update();
    }, 1000 / FPS);
  }

  private update(): void {
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
    this.updatePositions(deltaTime);
    this.removeHarvestedEntities();
    this.entityManager.pruneEntities();
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  private removeHarvestedEntities(): void {
    const harvestables = this.filterHarvestableEntities(this.entityManager.getEntities());

    for (let i = 0; i < harvestables.length; i++) {
      const harvestable = harvestables[i];
      if (harvestable.getIsHarvested()) {
        console.log("removing harvested entity");
        this.entityManager.markEntityForRemoval(harvestable as unknown as Entity);
      }
    }
  }

  private updatePositions(deltaTime: number): void {
    // Update players
    for (const player of this.players.values()) {
      const velocity = player.getVelocity();
      player.setPosition({
        x: player.getPosition().x + velocity.x * deltaTime,
        y: player.getPosition().y + velocity.y * deltaTime,
      });
      player.update(deltaTime);
    }

    // Update bullets
    for (const entity of this.entityManager.getEntities()) {
      if (entity.getType() === Entities.BULLET) {
        (entity as unknown as Updatable).update(deltaTime);
      }
    }
  }

  // TODO: This is a bit of a hack to get the game state to the client.
  // We should probably have a more elegant way to do this.
  private broadcastGameState(): void {
    const gameState = [
      ...Array.from(this.players.values()),
      ...this.entityManager.getEntities(),
    ].map((entity) => ({
      id: entity.getId(),
      position: "getPosition" in entity ? entity.getPosition() : undefined,
      velocity: "getVelocity" in entity ? entity.getVelocity() : undefined,
      type: entity.getType(),
      isHarvested: "getIsHarvested" in entity ? entity.getIsHarvested() : undefined,
    }));

    this.io.emit(Events.GAME_STATE_UPDATE, gameState);
  }
}

const gameServer = new GameServer();
