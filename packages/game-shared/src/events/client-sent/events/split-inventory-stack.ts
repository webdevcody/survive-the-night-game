import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface SplitInventoryStackEventData {
  slotIndex: number;
  quantity: number;
}

export class SplitInventoryStackEvent implements GameEvent<SplitInventoryStackEventData> {
  private readonly type: EventType = ClientSentEvents.SPLIT_INVENTORY_STACK;
  private readonly data: SplitInventoryStackEventData;

  constructor(data: SplitInventoryStackEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SplitInventoryStackEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SplitInventoryStackEventData): void {
    writer.writeUInt8(Math.max(0, Math.min(255, data.slotIndex ?? 0)));
    writer.writeUInt32(Math.max(0, Math.floor(data.quantity ?? 0)));
  }

  static deserializeFromBuffer(reader: BufferReader): SplitInventoryStackEventData {
    const slotIndex = reader.readUInt8();
    const quantity = reader.readUInt32();
    return { slotIndex, quantity };
  }
}
