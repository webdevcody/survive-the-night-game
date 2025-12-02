import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export class LootEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly entityId: number;

  constructor(entityid: number) {
    this.type = ServerSentEvents.LOOT;
    this.entityId = entityid;
  }

  getType(): EventType {
    return this.type;
  }

  getEntityId(): number {
    return this.entityId;
  }

  serialize(): number {
    return this.entityId;
  }

  static serializeToBuffer(writer: BufferWriter, data: number): void {
    writer.writeUInt16(data);
  }

  static deserializeFromBuffer(reader: BufferReader): number {
    return reader.readUInt16();
  }
}
