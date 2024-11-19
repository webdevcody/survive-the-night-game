import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Player } from "./shared/entities/player";
import { Events } from "./shared/events";

export const FPS = 30;
export const PLAYER_SPEED = 50;

class GameServer {
  private io: Server;
  private players: Map<string, Player> = new Map();
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
  }

  private setupSocketHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`Player connected: ${socket.id}`);

      const player = new Player(socket.id);
      this.players.set(socket.id, player);

      socket.on("playerInput", (input: { dx: number; dy: number }) => {
        const player = this.players.get(socket.id);
        if (player) {
          player.setVelocity({
            x: input.dx * PLAYER_SPEED,
            y: input.dy * PLAYER_SPEED,
          });
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        this.players.delete(socket.id);
        this.broadcastEntityRemoval(socket.id);
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
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  private updatePositions(deltaTime: number): void {
    for (const player of this.players.values()) {
      const velocity = player.getVelocity();
      // Normalize diagonal movement
      if (velocity.x !== 0 && velocity.y !== 0) {
        const normalizer = 1 / Math.sqrt(2);
        velocity.x *= normalizer;
        velocity.y *= normalizer;
      }

      player.setPosition({
        x: player.getPosition().x + velocity.x * deltaTime,
        y: player.getPosition().y + velocity.y * deltaTime,
      });
    }
  }

  private broadcastGameState(): void {
    this.io.emit(Events.GAME_STATE_UPDATE, Array.from(this.players.values()));
  }

  private broadcastEntityRemoval(id: string): void {
    this.io.emit(Events.ENTITY_REMOVAL, id);
  }
}

const gameServer = new GameServer();
