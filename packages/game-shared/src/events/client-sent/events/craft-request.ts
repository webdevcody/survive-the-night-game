import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { RecipeType } from "../../../util/recipes";

export type CraftRequestEventData = RecipeType;

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

  getRecipe(): RecipeType {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: CraftRequestEventData): void {
    writer.writeString(String(data));
  }

  static deserializeFromBuffer(reader: BufferReader): CraftRequestEventData {
    return reader.readString() as RecipeType;
  }
}

