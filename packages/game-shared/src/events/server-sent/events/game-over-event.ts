import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface GameOverEventData {
  timestamp: number;
  winnerId: number | null;
  winnerName: string | null;
  message: string;
}

export interface GameOverEventInput {
  winnerId?: number | null;
  winnerName?: string | null;
  message?: string;
}

export class GameOverEvent implements GameEvent<GameOverEventData> {
  private readonly type: EventType;
  private readonly data: GameOverEventData;

  constructor(input: GameOverEventInput = {}) {
    this.type = ServerSentEvents.GAME_OVER;
    this.data = {
      timestamp: Date.now(),
      winnerId: input.winnerId ?? null,
      winnerName: input.winnerName ?? null,
      message: input.message ?? "Game Over",
    };
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
    // Write hasWinner flag and winnerId
    writer.writeBoolean(data.winnerId !== null);
    writer.writeUInt32(data.winnerId ?? 0);
    // Write winnerName (empty string for null)
    writer.writeString(data.winnerName ?? "");
    // Write message
    writer.writeString(data.message);
  }

  static deserializeFromBuffer(reader: BufferReader): GameOverEventData {
    const timestamp = reader.readFloat64();
    const hasWinner = reader.readBoolean();
    const winnerIdRaw = reader.readUInt32();
    const winnerId = hasWinner ? winnerIdRaw : null;
    const winnerName = reader.readString();
    const message = reader.readString();
    return {
      timestamp,
      winnerId,
      winnerName: winnerName === "" ? null : winnerName,
      message,
    };
  }
}
