import { Server, Socket } from "socket.io";
import { createServer } from "http";
import { Vector2 } from "./shared/physics";

interface Player {
  id: string;
  position: Vector2;
  velocity: Vector2;
}

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

      // Create new player
      this.players.set(socket.id, {
        id: socket.id,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
      });

      socket.on("playerInput", (input: { dx: number; dy: number }) => {
        const player = this.players.get(socket.id);
        if (player) {
          player.velocity = {
            x: input.dx * PLAYER_SPEED,
            y: input.dy * PLAYER_SPEED,
          };
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
    this.broadcastGameState();
    this.lastUpdateTime = currentTime;
  }

  private updatePositions(deltaTime: number): void {
    for (const player of this.players.values()) {
      player.position.x += player.velocity.x * deltaTime;
      player.position.y += player.velocity.y * deltaTime;
    }
  }

  private broadcastGameState(): void {
    this.io.emit("gameState", Array.from(this.players.values()));
  }
}

const gameServer = new GameServer();
