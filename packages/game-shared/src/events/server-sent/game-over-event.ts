import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export interface GameOverEventData {
  timestamp: number;
}

export class GameOverEvent implements GameEvent<GameOverEventData> {
  private readonly type: EventType;
  private readonly data: GameOverEventData;

  constructor(timestamp: number = Date.now()) {
    this.type = ServerSentEvents.GAME_OVER;
    this.data = { timestamp };
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): GameOverEventData {
    return this.data;
  }

  getData(): GameOverEventData {
    return this.data;
  }

  getGameState(): GameOverEventData {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: GameOverEventData): void {
    writer.writeFloat64(data.timestamp);
  }

  static deserializeFromBuffer(reader: BufferReader): GameOverEventData {
    const timestamp = reader.readFloat64();
    return { timestamp };
  }
}
