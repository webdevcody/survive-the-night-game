import { defineGameConfig } from "@/game";
import { Packet } from "@/network";
import { Component, Entity } from "@/manager";

const PacketPlayer = Packet.create({
  name: "string",
});

class Player extends Entity<typeof PacketPlayer> {
  render() {
    console.log(this.packet.get("name"));
  }
}

const PacketPosition = Packet.create({
  x: "int32",
  y: "int32",
});

class Position extends Component<typeof PacketPosition> {}

export default defineGameConfig({
  mode: "server",
  setup: ({ registerEntity, registerComponent }) => {
    registerEntity(PacketPlayer, Player);
    registerComponent(PacketPosition, Position);
  },
});
