import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export class ZombieHurtEvent implements GameEvent<number> {
  private readonly type: EventType = ServerSentEvents.ZOMBIE_HURT;
  private readonly zombieId: number;

  constructor(zombieId: number) {
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
