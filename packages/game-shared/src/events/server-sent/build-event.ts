import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

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
    writer.writeFloat64(data.position?.x ?? 0);
    writer.writeFloat64(data.position?.y ?? 0);
    writer.writeString(data.soundType ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): BuildEventData {
    const playerId = reader.readUInt16();
    const x = reader.readFloat64();
    const y = reader.readFloat64();
    const soundType = reader.readString();
    return { playerId, position: { x, y }, soundType };
  }
}
