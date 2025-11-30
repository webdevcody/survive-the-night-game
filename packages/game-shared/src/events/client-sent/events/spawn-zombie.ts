import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SpawnZombieEventData {
  x: number;
  y: number;
}

export class SpawnZombieEvent implements GameEvent<SpawnZombieEventData> {
  private readonly type: EventType = ClientSentEvents.SPAWN_ZOMBIE;
  private readonly data: SpawnZombieEventData;

  constructor(data: SpawnZombieEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SpawnZombieEventData {
    return this.data;
  }

  getX(): number {
    return this.data.x;
  }

  getY(): number {
    return this.data.y;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SpawnZombieEventData): void {
    // Use Position2 (4 bytes) for compact serialization
    writer.writePosition2({ x: data.x ?? 0, y: data.y ?? 0 });
  }

  static deserializeFromBuffer(reader: BufferReader): SpawnZombieEventData {
    const position = reader.readPosition2();
    return { x: position.x, y: position.y };
  }
}
