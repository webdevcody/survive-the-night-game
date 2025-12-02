import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export type PlayerJoinedEventData = {
  displayName: string;
  playerId: number;
};

export class PlayerJoinedEvent implements GameEvent<PlayerJoinedEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly displayName: string;

  constructor(data: PlayerJoinedEventData) {
    this.type = ServerSentEvents.PLAYER_JOINED;
    this.playerId = data.playerId;
    this.displayName = data.displayName;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  serialize(): PlayerJoinedEventData {
    return {
      displayName: this.displayName,
      playerId: this.playerId,
    };
  }

  getDisplayName(): string {
    return this.displayName;
  }

  static serializeToBuffer(writer: BufferWriter, data: PlayerJoinedEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeString(data.displayName ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerJoinedEventData {
    const playerId = reader.readUInt16();
    const displayName = reader.readString();
    return { playerId, displayName };
  }
}
