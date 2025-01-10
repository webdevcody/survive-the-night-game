import EventEmitter from "node:events";
import { PacketType } from "./network";
import { Component, Entity } from "./manager";

type RegisterEntity = <T extends PacketType<any>>(
  packetType: T,
  entityType: typeof Entity<T>
) => void;
type RegisterComponent = <T extends PacketType<any>>(
  packetType: T,
  entityType: typeof Component<T>
) => void;

type GameSetup = {
  registerEntity: RegisterEntity;
  registerComponent: RegisterComponent;
};

type GameMode = "server" | "client" | "test";

type GameConfig = {
  mode: GameMode;
  setup: (setup: GameSetup) => void;
};

function defineGameConfig<T extends GameConfig>(config: T) {
  return config;
}

type GameEvent = {
  update: [deltaTime: number];
  stop: [];
};

class Game<T extends GameConfig> extends EventEmitter<GameEvent> {
  #config: T;

  #lastTickTime: number = 0;
  #isPaused = false;

  constructor(config: T) {
    super();
    this.#config = config;
  }

  private tick() {
    if (this.#isPaused) return;

    try {
      const startTickTime = performance.now();
      const deltaTime = startTickTime - this.#lastTickTime;
      this.emit("update", deltaTime);
      this.#lastTickTime = startTickTime;
    } catch (error) {
      console.error("Error during tick:", error);
    } finally {
      if (this.#config.mode === "server") {
        setImmediate(this.tick.bind(this));
      } else if (this.#config.mode == "client") {
        requestAnimationFrame(this.tick.bind(this));
      } else if (this.#config.mode === "test") {
        this.stop();
      }
    }
  }

  start() {
    this.#lastTickTime = performance.now();
    this.#isPaused = false;
    this.tick();
  }

  stop() {
    this.#isPaused = true;
    this.emit("stop");
  }
}

export { type GameConfig, defineGameConfig };
export default Game;
