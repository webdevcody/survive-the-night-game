import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { GameModeId } from "./game-started-event";

export interface YourIdEventData {
  playerId: number;
  gameMode: GameModeId;
}

export class YourIdEvent implements GameEvent<YourIdEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly gameMode: GameModeId;

  constructor(playerIdOrData: number | YourIdEventData, gameMode: GameModeId = "waves") {
    this.type = ServerSentEvents.YOUR_ID;
    if (typeof playerIdOrData === "object") {
      // Constructed from deserialized data
      this.playerId = playerIdOrData.playerId;
      this.gameMode = playerIdOrData.gameMode;
    } else {
      // Constructed with individual parameters
      this.playerId = playerIdOrData;
      this.gameMode = gameMode;
    }
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  getGameMode(): GameModeId {
    return this.gameMode;
  }

  serialize(): YourIdEventData {
    return { playerId: this.playerId, gameMode: this.gameMode };
  }

  static serializeToBuffer(writer: BufferWriter, data: YourIdEventData): void {
    writer.writeUInt16(data.playerId);
    writer.writeString(data.gameMode);
  }

  static deserializeFromBuffer(reader: BufferReader): YourIdEventData {
    const playerId = reader.readUInt16();
    const gameMode = reader.readString() as GameModeId;
    return { playerId, gameMode };
  }
}
