import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "@/events/events";
import Vector2 from "@/util/vector2";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import PoolManager from "../../../util/pool-manager";

export interface ExplosionEventData {
  position: Vector2;
  radius?: number;
}

export class ExplosionEvent implements GameEvent<ExplosionEventData> {
  private data: ExplosionEventData;

  constructor(data: ExplosionEventData) {
    this.data = data;
  }

  public getType() {
    return ServerSentEvents.EXPLOSION;
  }

  public serialize() {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: ExplosionEventData): void {
    // Handle both { position: Vector2 } and { x, y } formats
    const position = data.position ?? data;
    const x = position?.x ?? 0;
    const y = position?.y ?? 0;
    writer.writeFloat64(x);
    writer.writeFloat64(y);
    writer.writeFloat64(data.radius ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): ExplosionEventData {
    const x = reader.readFloat64();
    const y = reader.readFloat64();
    const radius = reader.readFloat64();
    // Return in format expected by ExplosionEvent constructor: { position: Vector2 }
    const poolManager = PoolManager.getInstance();
    return { position: poolManager.vector2.claim(x, y), radius };
  }
}
