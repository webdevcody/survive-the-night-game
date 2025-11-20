import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

interface ZombieDeathEventData {
  zombieId: number;
  killerId: number;
}

export class ZombieDeathEvent implements GameEvent<ZombieDeathEventData> {
  private readonly type: EventType;
  private readonly zombieId: number;
  private readonly killerId: number;

  constructor(zombieId: number, killerId: number = 0) {
    this.type = ServerSentEvents.ZOMBIE_DEATH;
    this.zombieId = zombieId;
    this.killerId = killerId;
  }

  getType(): EventType {
    return this.type;
  }

  getZombieId(): number {
    return this.zombieId;
  }

  getKillerId(): number {
    return this.killerId;
  }

  serialize(): ZombieDeathEventData {
    return {
      zombieId: this.zombieId,
      killerId: this.killerId,
    };
  }

  static serializeToBuffer(writer: BufferWriter, data: ZombieDeathEventData): void {
    writer.writeUInt16(data.zombieId);
    writer.writeUInt16(data.killerId);
  }

  static deserializeFromBuffer(reader: BufferReader): ZombieDeathEventData {
    const zombieId = reader.readUInt16();
    const killerId = reader.readUInt16();
    return { zombieId, killerId };
  }
}
