import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface CraftRequestEventData {
  recipeId: string;
  stationEntityId: number;
}

export class CraftRequestEvent implements GameEvent<CraftRequestEventData> {
  private readonly type: EventType = ClientSentEvents.CRAFT_REQUEST;
  private readonly data: CraftRequestEventData;

  constructor(data: CraftRequestEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): CraftRequestEventData {
    return this.data;
  }

  getRecipeId(): string {
    return this.data.recipeId;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: CraftRequestEventData): void {
    writer.writeString(data.recipeId);
    writer.writeUInt32(data.stationEntityId);
  }

  static deserializeFromBuffer(reader: BufferReader): CraftRequestEventData {
    return {
      recipeId: reader.readString(),
      stationEntityId: reader.readUInt32(),
    };
  }
}
