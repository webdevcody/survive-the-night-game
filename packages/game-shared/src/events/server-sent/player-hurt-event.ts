import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export class PlayerHurtEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly playerId: number;

  constructor(playerId: number) {
    this.type = ServerSentEvents.PLAYER_HURT;
    this.playerId = playerId;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  serialize(): number {
    return this.playerId;
  }

  static serializeToBuffer(writer: BufferWriter, data: number): void {
    writer.writeUInt16(data);
  }

  static deserializeFromBuffer(reader: BufferReader): number {
    return reader.readUInt16();
  }
}
