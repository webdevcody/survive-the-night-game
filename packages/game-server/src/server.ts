import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Player } from "./shared/entities/player";
import { Events } from "./shared/events";
import { Entity } from "./shared/entities";
import { Tree } from "./shared/entities/tree";
import { distance, Vector2 } from "./shared/physics";
import { Harvestable, Positionable } from "./shared/traits";

export const FPS = 30;
export const PLAYER_SPEED = 50;

class GameServer {
  private io: Server;
  private players: Map<string, Player> = new Map();
  private entities: Entity[] = [];
  private lastUpdateTime: number = Date.now();

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
    this.startGameLoop();

    // TODO: TEMP, remove this later
    const tree = new Tree("tree1");
    tree.setPosition({ x: 100, y: 50 });
    this.entities.push(tree);

    const tree2 = new Tree("tree2");
    tree2.setPosition({ x: 120, y: 75 });
    this.entities.push(tree2);

    const tree3 = new Tree("tree3");
    tree3.setPosition({ x: 80, y: 40 });
    this.entities.push(tree3);
  }

  private getPositionableEntities() {
    return this.entities.filter((entity) => {
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

      const player = new Player(socket.id);
      this.players.set(socket.id, player);

      socket.on(
        "playerInput",
        (input: { dx: number; dy: number; harvest: boolean }) => {
          const player = this.players.get(socket.id);
          if (player) {
            const dx =
              input.dx !== 0 && input.dy !== 0
                ? input.dx / Math.sqrt(2)
                : input.dx;

            const dy =
              input.dx !== 0 && input.dy !== 0
                ? input.dy / Math.sqrt(2)
                : input.dy;

            player.setVelocity({
              x: dx * PLAYER_SPEED,
              y: dy * PLAYER_SPEED,
            });

            if (input.harvest) {
              const nearbyEntities = this.getNearbyEntities(
                player.getPosition(),
                10
              );

              const harvestableEntities =
                this.filterHarvestableEntities(nearbyEntities);

              const first = harvestableEntities[0];

              if (first) {
                first.harvest();
              }
            }
          }
        }
      );

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
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  private removeHarvestedEntities(): void {
    const harvestables = this.filterHarvestableEntities(this.entities);

    for (let i = 0; i < harvestables.length; i++) {
      const harvestable = harvestables[i];
      if (harvestable.getIsHarvested()) {
        this.entities.splice(i, 1);
      }
    }
  }

  private updatePositions(deltaTime: number): void {
    for (const player of this.players.values()) {
      const velocity = player.getVelocity();

      player.setPosition({
        x: player.getPosition().x + velocity.x * deltaTime,
        y: player.getPosition().y + velocity.y * deltaTime,
      });
    }
  }

  private broadcastGameState(): void {
    this.io.emit(Events.GAME_STATE_UPDATE, [
      ...Array.from(this.players.values()),
      ...this.entities,
    ]);
  }
}

const gameServer = new GameServer();
