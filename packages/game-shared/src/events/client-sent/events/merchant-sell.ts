import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface MerchantSellEventData {
  merchantId: number;
  inventorySlot: number;
}

export class MerchantSellEvent implements GameEvent<MerchantSellEventData> {
  private readonly type: EventType = ClientSentEvents.MERCHANT_SELL;
  private readonly data: MerchantSellEventData;

  constructor(data: MerchantSellEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): MerchantSellEventData {
    return this.data;
  }

  getMerchantId(): number {
    return this.data.merchantId;
  }

  getInventorySlot(): number {
    return this.data.inventorySlot;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: MerchantSellEventData): void {
    writer.writeUInt16(data.merchantId ?? 0);
    writer.writeUInt8(data.inventorySlot ?? 0);
  }

  static deserializeFromBuffer(reader: BufferReader): MerchantSellEventData {
    const merchantId = reader.readUInt16();
    const inventorySlot = reader.readUInt8();
    return { merchantId, inventorySlot };
  }
}
