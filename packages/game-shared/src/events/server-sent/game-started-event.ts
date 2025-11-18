import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "../events";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface GameStartedEventData {
  timestamp: number;
}

export class GameStartedEvent implements GameEvent<GameStartedEventData> {
  private readonly data: GameStartedEventData;

  constructor(timestamp: number = Date.now()) {
    this.data = { timestamp };
  }

  public getType() {
    return ServerSentEvents.GAME_STARTED;
  }

  public serialize(): GameStartedEventData {
    return this.data;
  }

  public getData(): GameStartedEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: GameStartedEventData): void {
    writer.writeFloat64(data.timestamp);
  }

  static deserializeFromBuffer(reader: BufferReader): GameStartedEventData {
    const timestamp = reader.readFloat64();
    return { timestamp };
  }
}
