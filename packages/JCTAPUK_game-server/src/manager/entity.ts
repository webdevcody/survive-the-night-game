import { PacketGet, PacketType } from "@/network";
import Component from "./component";

export class Entity<T extends PacketType<any>> {
  #id: number;
  #packet: PacketGet<T>;

  #createComponents: Map<number, Component<any>>;
  #updateComponents: Map<number, Component<any>>;
  #removeComponents: Set<number>;

  get id() {
    return this.#id;
  }

  get packet() {
    return this.#packet;
  }

  constructor(id: number, packet: PacketGet<T>) {
    this.#createComponents = new Map();
    this.#updateComponents = new Map();
    this.#removeComponents = new Set();

    this.#id = id;
    this.#packet = packet;
  }
}

export default Entity;
