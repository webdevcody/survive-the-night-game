import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { ItemType } from "../../../util/inventory";
import { itemTypeToUInt16, uint16ToItemType } from "./utils";

export interface ConsumeItemEventData {
  itemType: ItemType | null; // null means consume from current inventory slot
}

export class ConsumeItemEvent implements GameEvent<ConsumeItemEventData> {
  private readonly type: EventType = ClientSentEvents.CONSUME_ITEM;
  private readonly data: ConsumeItemEventData;

  constructor(data: ConsumeItemEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): ConsumeItemEventData {
    return this.data;
  }

  getItemType(): ItemType | null {
    return this.data.itemType;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: ConsumeItemEventData): void {
    const hasItemType = data.itemType !== null && data.itemType !== undefined;
    writer.writeUInt8(hasItemType ? 1 : 0);
    if (hasItemType) {
      writer.writeUInt16(itemTypeToUInt16(data.itemType));
    }
  }

  static deserializeFromBuffer(reader: BufferReader): ConsumeItemEventData {
    const hasItemType = reader.readUInt8() !== 0;
    const itemType = hasItemType ? uint16ToItemType(reader.readUInt16()) : null;
    return { itemType };
  }
}

