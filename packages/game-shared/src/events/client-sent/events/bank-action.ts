import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

/** 0 stash, 1 withdraw, 2 drop, 3 use, 4 equip */
export type BankActionKind = 0 | 1 | 2 | 3 | 4;

/** 0 bag, 1 bank, 2 equipment */
export type BankActionSource = 0 | 1 | 2;

export interface BankActionEventData {
  lockerEntityId: number;
  action: BankActionKind;
  source: BankActionSource;
  /** Bag or bank slot (0-based). Ignored when source is equipment (use equipSlotIndex). */
  slotIndex: number;
  /** Equipment slot index 0-6 for armor or 7-11 for loadout rows when action is equip; else 255. */
  equipSlotIndex: number;
}

export class BankActionEvent implements GameEvent<BankActionEventData> {
  private readonly type: EventType = ClientSentEvents.BANK_ACTION;
  private readonly data: BankActionEventData;

  constructor(data: BankActionEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): BankActionEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: BankActionEventData): void {
    writer.writeUInt32(Math.max(0, Math.floor(data.lockerEntityId)));
    writer.writeUInt8(Math.max(0, Math.min(255, data.action)));
    writer.writeUInt8(Math.max(0, Math.min(255, data.source)));
    writer.writeUInt8(Math.max(0, Math.min(255, data.slotIndex)));
    writer.writeUInt8(Math.max(0, Math.min(255, data.equipSlotIndex)));
  }

  static deserializeFromBuffer(reader: BufferReader): BankActionEventData {
    const lockerEntityId = reader.readUInt32();
    const action = reader.readUInt8() as BankActionKind;
    const source = reader.readUInt8() as BankActionSource;
    const slotIndex = reader.readUInt8();
    const equipSlotIndex = reader.readUInt8();
    return { lockerEntityId, action, source, slotIndex, equipSlotIndex };
  }
}
