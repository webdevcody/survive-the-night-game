import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface GameMessageEventData {
  message: string;
  color?: string;
  type?: number;
}

export class GameMessageEvent implements GameEvent<GameMessageEventData> {
  private data: GameMessageEventData;
  private readonly type: EventType;

  constructor(data: GameMessageEventData) {
    this.data = data;
    this.type = ServerSentEvents.GAME_MESSAGE;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): GameMessageEventData {
    return this.data;
  }

  public getData(): GameMessageEventData {
    return this.data;
  }

  public getMessage(): string {
    return this.data.message;
  }

  public getColor(): string | undefined {
    return this.data.color;
  }

  static serializeToBuffer(writer: BufferWriter, data: GameMessageEventData): void {
    writer.writeString(data.message ?? "");
    writer.writeUInt32(data.type ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): GameMessageEventData {
    const message = reader.readString();
    const type = reader.readUInt32();
    return { message, type };
  }
}
