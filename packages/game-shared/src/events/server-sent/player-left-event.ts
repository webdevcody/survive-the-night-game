import { ServerSentEvents, EventType } from "../events";
import { GameEvent } from "../types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

interface PlayerLeftEventData {
  playerId: number;
  displayName: string;
}

export class PlayerLeftEvent implements GameEvent<PlayerLeftEventData> {
  private type: EventType;
  private playerId: number;
  private displayName: string;

  constructor(data: PlayerLeftEventData) {
    this.type = ServerSentEvents.PLAYER_LEFT;
    this.playerId = data.playerId;
    this.displayName = data.displayName;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  serialize(): PlayerLeftEventData {
    return { playerId: this.playerId, displayName: this.displayName };
  }

  static serializeToBuffer(writer: BufferWriter, data: PlayerLeftEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeString(data.displayName ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerLeftEventData {
    const playerId = reader.readUInt16();
    const displayName = reader.readString();
    return { playerId, displayName };
  }
}
