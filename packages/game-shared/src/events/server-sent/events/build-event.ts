import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { encodeSoundType, decodeSoundType } from "../../../util/sound-type-encoding";

export interface BuildEventData {
  playerId: number;
  position: { x: number; y: number };
  soundType: string;
}

export class BuildEvent implements GameEvent<BuildEventData> {
  private readonly type: EventType;
  private readonly data: BuildEventData;

  constructor(data: BuildEventData) {
    this.type = ServerSentEvents.BUILD;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): BuildEventData {
    return this.data;
  }

  getData(): BuildEventData {
    return this.data;
  }

  getPlayerId(): number {
    return this.data.playerId;
  }

  getPosition(): { x: number; y: number } {
    return this.data.position;
  }

  getSoundType(): string {
    return this.data.soundType;
  }

  static serializeToBuffer(writer: BufferWriter, data: BuildEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    // Use Position2 (4 bytes) instead of 2x Float64 (16 bytes)
    const pos = data.position ?? { x: 0, y: 0 };
    writer.writePosition2({ x: pos.x, y: pos.y } as any);
    writer.writeUInt8(encodeSoundType(data.soundType ?? "build"));
  }

  static deserializeFromBuffer(reader: BufferReader): BuildEventData {
    const playerId = reader.readUInt16();
    const position = reader.readPosition2();
    const soundType = decodeSoundType(reader.readUInt8());
    return { playerId, position: { x: position.x, y: position.y }, soundType };
  }
}
