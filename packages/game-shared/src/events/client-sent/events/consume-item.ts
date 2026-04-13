import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { ItemType } from "../../../util/inventory";
import { itemTypeToUInt16, uint16ToItemType } from "./utils";

export interface ConsumeItemEventData {
  itemType: ItemType | null; // null means consume from current inventory slot
  /** Optional explicit bag slot index (0-based) for consuming from a clicked inventory slot. */
  slotIndex?: number;
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
    const hasSlotIndex = data.slotIndex !== undefined && data.slotIndex !== null;
    writer.writeUInt8(hasSlotIndex ? 1 : 0);
    if (hasSlotIndex) {
      writer.writeUInt8(Math.max(0, Math.min(255, Math.floor(data.slotIndex ?? 0))));
    }
  }

  static deserializeFromBuffer(reader: BufferReader): ConsumeItemEventData {
    const hasItemType = reader.readUInt8() !== 0;
    const itemType = hasItemType ? uint16ToItemType(reader.readUInt16()) : null;
    let slotIndex: number | undefined;
    if (reader.hasMore()) {
      const hasSlotIndex = reader.readUInt8() !== 0;
      if (hasSlotIndex && reader.hasMore()) {
        slotIndex = reader.readUInt8();
      }
    }
    return { itemType, slotIndex };
  }
}

