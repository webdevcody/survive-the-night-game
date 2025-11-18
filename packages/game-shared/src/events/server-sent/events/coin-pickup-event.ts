import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export class CoinPickupEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly entityId: number;

  constructor(entityid: number) {
    this.type = ServerSentEvents.COIN_PICKUP;
    this.entityId = entityid;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): number {
    return this.entityId;
  }

  getEntityId(): number {
    return this.entityId;
  }

  static serializeToBuffer(writer: BufferWriter, data: number): void {
    writer.writeUInt16(data);
  }

  static deserializeFromBuffer(reader: BufferReader): number {
    return reader.readUInt16();
  }
}
