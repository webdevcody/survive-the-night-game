import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { getConfig } from "../../../config";
import {
  decodeEquipmentSlotKey,
  encodeEquipmentSlotKey,
  type EquipmentSlotKey,
} from "../../../util/inventory";

export interface SwapBagAndEquipmentEventData {
  bagIndex: number;
  equipSlot: EquipmentSlotKey;
}

export class SwapBagAndEquipmentEvent implements GameEvent<SwapBagAndEquipmentEventData> {
  private readonly type: EventType = ClientSentEvents.SWAP_BAG_AND_EQUIPMENT;
  private readonly data: SwapBagAndEquipmentEventData;

  constructor(data: SwapBagAndEquipmentEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SwapBagAndEquipmentEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SwapBagAndEquipmentEventData): void {
    const maxSlots = getConfig().player.MAX_INVENTORY_SLOTS;
    writer.writeUInt8(Math.max(0, Math.min(maxSlots - 1, data.bagIndex ?? 0)));
    writer.writeUInt8(encodeEquipmentSlotKey(data.equipSlot));
  }

  static deserializeFromBuffer(reader: BufferReader): SwapBagAndEquipmentEventData {
    const bagIndex = reader.readUInt8();
    const slotCode = reader.readUInt8();
    const equipSlot = decodeEquipmentSlotKey(slotCode) ?? "mainHand";
    return { bagIndex, equipSlot };
  }
}
