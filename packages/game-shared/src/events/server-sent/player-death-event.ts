import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../util/buffer-serialization";

export type PlayerDeathEventData = {
  playerId: number;
  displayName: string;
};

export class PlayerDeathEvent implements GameEvent<PlayerDeathEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly displayName: string;

  constructor(data: PlayerDeathEventData) {
    this.type = ServerSentEvents.PLAYER_DEATH;
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

  serialize(): PlayerDeathEventData {
    return {
      playerId: this.playerId,
      displayName: this.displayName,
    };
  }

  static serializeToBuffer(writer: BufferWriter, data: PlayerDeathEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeString(data.displayName ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerDeathEventData {
    const playerId = reader.readUInt16();
    const displayName = reader.readString();
    return { playerId, displayName };
  }
}
