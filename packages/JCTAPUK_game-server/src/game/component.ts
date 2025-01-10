import { Packet } from "@/network";

export class Component {
  #type: number;
  #packet: Packet<any>;

  get id() {
    return this.#type;
  }

  constructor(type: number, packet: Packet<any>) {
    this.#type = type;
    this.#packet = packet;
  }
}

export default Component;
