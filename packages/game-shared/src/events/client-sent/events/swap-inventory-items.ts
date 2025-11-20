import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SwapInventoryItemsEventData {
  fromSlotIndex: number; // 0-indexed (0-9)
  toSlotIndex: number; // 0-indexed (0-9)
}

export class SwapInventoryItemsEvent implements GameEvent<SwapInventoryItemsEventData> {
  private readonly type: EventType = ClientSentEvents.SWAP_INVENTORY_ITEMS;
  private readonly data: SwapInventoryItemsEventData;

  constructor(data: SwapInventoryItemsEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SwapInventoryItemsEventData {
    return this.data;
  }

  getFromSlotIndex(): number {
    return this.data.fromSlotIndex;
  }

  getToSlotIndex(): number {
    return this.data.toSlotIndex;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SwapInventoryItemsEventData): void {
    writer.writeUInt8(Math.max(0, Math.min(9, data.fromSlotIndex ?? 0)));
    writer.writeUInt8(Math.max(0, Math.min(9, data.toSlotIndex ?? 0)));
  }

  static deserializeFromBuffer(reader: BufferReader): SwapInventoryItemsEventData {
    const fromSlotIndex = reader.readUInt8();
    const toSlotIndex = reader.readUInt8();
    return { fromSlotIndex, toSlotIndex };
  }
}
