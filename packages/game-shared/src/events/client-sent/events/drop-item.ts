import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface DropItemEventData {
  slotIndex: number;
  amount?: number;
}

export class DropItemEvent implements GameEvent<DropItemEventData> {
  private readonly type: EventType = ClientSentEvents.DROP_ITEM;
  private readonly data: DropItemEventData;

  constructor(data: DropItemEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): DropItemEventData {
    return this.data;
  }

  getSlotIndex(): number {
    return this.data.slotIndex;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: DropItemEventData): void {
    writer.writeUInt8(Math.max(0, Math.min(255, data.slotIndex ?? 0)));
    writer.writeBoolean(data.amount != null);
    if (data.amount != null) {
      writer.writeUInt16(Math.max(0, Math.min(65535, data.amount)));
    }
  }

  static deserializeFromBuffer(reader: BufferReader): DropItemEventData {
    const slotIndex = reader.readUInt8();
    let amount: number | undefined;
    if (reader.hasMore() && reader.readBoolean()) {
      amount = reader.readUInt16();
    }
    return { slotIndex, amount };
  }
}
