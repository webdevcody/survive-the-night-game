import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

interface PlayerDroppedItemEventData {
  playerId: number;
  itemType: string;
}

export class PlayerDroppedItemEvent implements GameEvent<PlayerDroppedItemEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly itemType: string;

  constructor(data: PlayerDroppedItemEventData) {
    this.type = ServerSentEvents.PLAYER_DROPPED_ITEM;
    this.playerId = data.playerId;
    this.itemType = data.itemType;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  serialize(): PlayerDroppedItemEventData {
    return {
      playerId: this.playerId,
      itemType: this.itemType,
    };
  }

  static serializeToBuffer(writer: BufferWriter, data: PlayerDroppedItemEventData): void {
    writer.writeUInt16(data.playerId ?? 0);
    writer.writeString(data.itemType ?? "");
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerDroppedItemEventData {
    const playerId = reader.readUInt16();
    const itemType = reader.readString();
    return { playerId, itemType };
  }
}
