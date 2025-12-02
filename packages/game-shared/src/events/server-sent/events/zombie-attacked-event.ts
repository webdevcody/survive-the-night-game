import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export class ZombieAttackedEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly zombieId: number;

  constructor(zombieId: number) {
    this.type = ServerSentEvents.ZOMBIE_ATTACKED;
    this.zombieId = zombieId;
  }

  getType(): EventType {
    return this.type;
  }

  getZombieId(): number {
    return this.zombieId;
  }

  serialize(): number {
    return this.zombieId;
  }

  static serializeToBuffer(writer: BufferWriter, data: number): void {
    writer.writeUInt16(data);
  }

  static deserializeFromBuffer(reader: BufferReader): number {
    return reader.readUInt16();
  }
}
