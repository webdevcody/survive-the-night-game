import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

export interface MerchantBuyEventData {
  merchantId: number;
  itemIndex: number;
}

export class MerchantBuyEvent implements GameEvent<MerchantBuyEventData> {
  private readonly type: EventType = ClientSentEvents.MERCHANT_BUY;
  private readonly data: MerchantBuyEventData;

  constructor(data: MerchantBuyEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): MerchantBuyEventData {
    return this.data;
  }

  getMerchantId(): number {
    return this.data.merchantId;
  }

  getItemIndex(): number {
    return this.data.itemIndex;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: MerchantBuyEventData): void {
    writer.writeUInt16(data.merchantId ?? 0);
    writer.writeUInt32(Math.max(0, Math.trunc(data.itemIndex ?? 0)));
  }

  static deserializeFromBuffer(reader: BufferReader): MerchantBuyEventData {
    const merchantId = reader.readUInt16();
    const itemIndex = reader.readUInt32();
    return { merchantId, itemIndex };
  }
}
