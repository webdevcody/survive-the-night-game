import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface ZombieAlertedEventData {
  zombieId: number;
  position: { x: number; y: number };
}

export class ZombieAlertedEvent implements GameEvent<ZombieAlertedEventData> {
  private readonly type: EventType;
  private readonly data: ZombieAlertedEventData;

  constructor(data: ZombieAlertedEventData);
  constructor(zombieId: number, position: { x: number; y: number });
  constructor(
    dataOrZombieId: ZombieAlertedEventData | number,
    position?: { x: number; y: number }
  ) {
    this.type = ServerSentEvents.ZOMBIE_ALERTED;
    if (typeof dataOrZombieId === "number" && position) {
      this.data = { zombieId: dataOrZombieId, position };
    } else {
      this.data = dataOrZombieId as ZombieAlertedEventData;
    }
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): ZombieAlertedEventData {
    return this.data;
  }

  getData(): ZombieAlertedEventData {
    return this.data;
  }

  getZombieId(): number {
    return this.data.zombieId;
  }

  getPosition(): { x: number; y: number } {
    return this.data.position;
  }

  static serializeToBuffer(writer: BufferWriter, data: ZombieAlertedEventData): void {
    writer.writeUInt16(data.zombieId);
    writer.writeFloat64(data.position.x);
    writer.writeFloat64(data.position.y);
  }

  static deserializeFromBuffer(reader: BufferReader): ZombieAlertedEventData {
    const zombieId = reader.readUInt16();
    const x = reader.readFloat64();
    const y = reader.readFloat64();
    return { zombieId, position: { x, y } };
  }
}
