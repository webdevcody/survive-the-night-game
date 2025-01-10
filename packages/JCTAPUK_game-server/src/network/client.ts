import WebSocket from "ws";

import { World } from "@/game";
import Packet from "./packet";
import EventEmitter from "node:events";

type ClientEvent = {
  close: [code: number, reason: Buffer];
  open: [];
  message: [message: Packet<any>];
};

class Client extends EventEmitter<ClientEvent> {
  #world: World;
  #socket: WebSocket;

  get world() {
    return this.#world;
  }

  get socket() {
    return this.#socket;
  }

  constructor(world: World, socket: WebSocket) {
    super();

    this.#world = world;
    this.#socket = socket;

    this.#socket.on("close", (code, reason) => {
      this.emit("close", code, reason);
    });

    this.#socket.on("open", () => {
      this.emit("open");
    });

    this.#socket.on("message", (buffer) => {});
  }

  broadcast() {}

  send(message: Packet<any>) {}
}

export default Client;
