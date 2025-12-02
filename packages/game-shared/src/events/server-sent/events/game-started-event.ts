import { GameEvent } from "../../types";
import { ServerSentEvents } from "../../events";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export type GameModeId = "waves" | "battle_royale" | "infection";

export interface GameStartedEventData {
  timestamp: number;
  gameMode: GameModeId;
}

export class GameStartedEvent implements GameEvent<GameStartedEventData> {
  private readonly data: GameStartedEventData;

  constructor(timestamp: number = Date.now(), gameMode: GameModeId = "waves") {
    this.data = { timestamp, gameMode };
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
    writer.writeString(data.gameMode);
  }

  static deserializeFromBuffer(reader: BufferReader): GameStartedEventData {
    const timestamp = reader.readFloat64();
    const gameMode = reader.readString() as GameModeId;
    return { timestamp, gameMode };
  }
}
