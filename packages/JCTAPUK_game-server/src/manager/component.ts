import { PacketGet, PacketType } from "@/network";

export class Component<T extends PacketType<any>> {
  #type: number;
  #packet: PacketGet<T>;

  get type() {
    return this.#type;
  }

  get packet() {
    return this.#packet;
  }

  constructor(type: number, packet: PacketGet<T>) {
    this.#type = type;
    this.#packet = packet;
  }
}

export default Component;
