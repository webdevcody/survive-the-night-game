import WebSocket, { WebSocketServer } from "ws";
import { World } from "@/game";
import Client from "./client";
import Packet from "./packet";
import EventEmitter from "node:events";
import { IncomingMessage } from "node:http";

const FPS = 20;
const TICK_RATE_MS = 1000 / FPS;

type ServerEvent = {
  connection: [client: Client];
};

type ServerOptions = WebSocket.ServerOptions<typeof WebSocket, typeof IncomingMessage>;

class Server extends EventEmitter<ServerEvent> {
  // fixed update
  #lastUpdateTime: number = 0;
  #accumulatedTime: number = 0;

  #world: World;
  #server: WebSocketServer;

  // store
  #createClients: Map<WebSocket, Client>;
  #updateClients: Map<WebSocket, Client>;
  #removeClients: Set<WebSocket>;

  // optional
  #isFrozzen: boolean = true;

  get world() {
    return this.#world;
  }

  get createClients() {
    return this.#createClients.values();
  }

  get updateClients() {
    return this.#updateClients.values();
  }

  get removeClients() {
    return this.#removeClients.values();
  }

  constructor(world: World, options?: ServerOptions) {
    super();

    this.#createClients = new Map();
    this.#updateClients = new Map();
    this.#removeClients = new Set();

    this.#world = world;
    this.#server = new WebSocketServer(options);

    this.#server.on("connection", (socket) => {
      const client = new Client(this.world, socket);

      this.createClient(client);
      this.emit("connection", client);

      client.on("close", () => {
        this.removeClient(client);
      });
    });
  }

  public createClient(client: Client) {
    if (this.#createClients.has(client.socket) || this.#updateClients.has(client.socket)) {
      throw new Error();
    }

    if (this.#removeClients.has(client.socket)) {
      this.#removeClients.delete(client.socket);
    }

    this.#createClients.set(client.socket, client);

    if (this.#updateClients.size == 0) {
      this.#isFrozzen = false;
    }
  }

  public removeClient(client: Client) {
    if (this.#removeClients.has(client.socket) || !this.#updateClients.has(client.socket)) {
      throw new Error();
    }

    if (this.#createClients.has(client.socket)) {
      this.#createClients.delete(client.socket);
    }

    this.#removeClients.add(client.socket);

    if (this.#updateClients.size - this.#removeClients.size == 0) {
      this.#isFrozzen = true;
    }
  }

  close() {
    this.#server.close();
  }

  tick() {
    this.world.tick();

    const startUpdateTime = performance.now();
    const deltaTime = startUpdateTime - this.#lastUpdateTime;
    this.update(deltaTime);
    this.#lastUpdateTime = startUpdateTime;

    this.broadcast();
  }

  update(deltaTime: number) {
    if (!this.#isFrozzen) {
      for (const [socket, client] of this.#createClients) {
        this.#updateClients.set(socket, client);
      }

      for (const socket of this.#removeClients) {
        this.#updateClients.delete(socket);
      }

      this.#accumulatedTime += deltaTime;

      while (this.#accumulatedTime >= TICK_RATE_MS) {
        this.fixedUpdate(TICK_RATE_MS / 1000);
        this.#accumulatedTime -= TICK_RATE_MS;
      }
    }
  }

  fixedUpdate(deltaTime: number) {
    this.broadcast();
  }

  broadcast() {
    for (const [socket, client] of this.#updateClients) {
      client.broadcast();
    }
  }

  send(message: Packet<any>) {
    for (const client of this.updateClients) {
      client.send(message);
    }
  }
}

export default Server;
