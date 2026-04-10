import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { getConfig } from "../../../config";
import { FISTS_INVENTORY_SENTINEL } from "../../../constants/inventory-sentinel";

export interface SelectInventorySlotEventData {
  slotIndex: number; // 1-indexed (1-10)
}

export class SelectInventorySlotEvent implements GameEvent<SelectInventorySlotEventData> {
  private readonly type: EventType = ClientSentEvents.SELECT_INVENTORY_SLOT;
  private readonly data: SelectInventorySlotEventData;

  constructor(data: SelectInventorySlotEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SelectInventorySlotEventData {
    return this.data;
  }

  getSlotIndex(): number {
    return this.data.slotIndex;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SelectInventorySlotEventData): void {
    const max = getConfig().player.MAX_INVENTORY_SLOTS;
    const slot = data.slotIndex;
    if (slot === FISTS_INVENTORY_SENTINEL) {
      writer.writeUInt8(FISTS_INVENTORY_SENTINEL);
      return;
    }
    writer.writeUInt8(Math.max(1, Math.min(max, slot ?? 1)));
  }

  static deserializeFromBuffer(reader: BufferReader): SelectInventorySlotEventData {
    const slotIndex = reader.readUInt8();
    return { slotIndex };
  }
}

