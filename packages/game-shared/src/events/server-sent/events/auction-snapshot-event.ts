import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import type { AuctionHouseSnapshotPayload } from "../../../util/auction-types";

export class AuctionSnapshotEvent implements GameEvent<AuctionHouseSnapshotPayload> {
  private readonly type: EventType = ServerSentEvents.AUCTION_SNAPSHOT;
  private readonly data: AuctionHouseSnapshotPayload;

  constructor(data: AuctionHouseSnapshotPayload) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): AuctionHouseSnapshotPayload {
    return this.data;
  }

  static serializeToBuffer(writer: BufferWriter, data: AuctionHouseSnapshotPayload): void {
    const json = JSON.stringify(data);
    const enc = new TextEncoder().encode(json);
    writer.writeUInt32(enc.length);
    for (let i = 0; i < enc.length; i++) {
      writer.writeUInt8(enc[i]!);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): AuctionHouseSnapshotPayload {
    const len = reader.readUInt32();
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = reader.readUInt8();
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as AuctionHouseSnapshotPayload;
  }
}
