import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { AuctionActionKind } from "../../../util/auction-types";

export interface AuctionActionEventData {
  auctionHouseEntityId: number;
  kind: AuctionActionKind;
  bagSlotIndex: number;
  price: number;
  listingId: string;
  /**
   * For `list` on a stackable bag item: how many to list (1..stack). `0` means the full stack.
   * Ignored for other action kinds (send0).
   */
  listQuantity: number;
}

const KIND_TO_U8: Record<AuctionActionKind, number> = {
  snapshot: 0,
  list: 1,
  buy: 2,
  cancel: 3,
  claim: 4,
};

const U8_TO_KIND: AuctionActionKind[] = ["snapshot", "list", "buy", "cancel", "claim"];

function encodeKind(kind: AuctionActionKind): number {
  return KIND_TO_U8[kind] ?? 0;
}

function decodeKind(v: number): AuctionActionKind {
  return U8_TO_KIND[v] ?? "snapshot";
}

export class AuctionActionEvent implements GameEvent<AuctionActionEventData> {
  private readonly type: EventType = ClientSentEvents.AUCTION_ACTION;
  private readonly data: AuctionActionEventData;

  constructor(data: AuctionActionEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): AuctionActionEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: AuctionActionEventData): void {
    writer.writeUInt32(Math.max(0, Math.floor(data.auctionHouseEntityId)));
    writer.writeUInt8(encodeKind(data.kind));
    writer.writeUInt8(Math.max(0, Math.min(255, data.bagSlotIndex)));
    writer.writeUInt32(Math.max(0, Math.floor(data.price)));
    const idBytes = new TextEncoder().encode(data.listingId ?? "");
    writer.writeUInt16(Math.min(65535, idBytes.length));
    for (let i = 0; i < Math.min(65535, idBytes.length); i++) {
      writer.writeUInt8(idBytes[i]!);
    }
    writer.writeUInt32(Math.max(0, Math.floor(data.listQuantity ?? 0)));
  }

  static deserializeFromBuffer(reader: BufferReader): AuctionActionEventData {
    const auctionHouseEntityId = reader.readUInt32();
    const kind = decodeKind(reader.readUInt8());
    const bagSlotIndex = reader.readUInt8();
    const price = reader.readUInt32();
    const len = reader.readUInt16();
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = reader.readUInt8();
    }
    const listingId = new TextDecoder().decode(bytes);
    let listQuantity = 0;
    if (reader.buffer.byteLength - reader.getOffset() >= 4) {
      listQuantity = reader.readUInt32();
    }
    return { auctionHouseEntityId, kind, bagSlotIndex, price, listingId, listQuantity };
  }
}
