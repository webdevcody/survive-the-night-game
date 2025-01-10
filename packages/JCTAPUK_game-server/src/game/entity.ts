import { Packet } from "@/network";
import Component from "./component";

export class Entity {
  #id: number;
  #packet: Packet<any>;

  #createComponents: Map<number, Component>;
  #updateComponents: Map<number, Component>;
  #removeComponents: Set<number>;

  get id() {
    return this.#id;
  }

  constructor(id: number, packet: Packet<any>) {
    this.#createComponents = new Map();
    this.#updateComponents = new Map();
    this.#removeComponents = new Set();

    this.#id = id;
    this.#packet = packet;
  }
}

export default Entity;
