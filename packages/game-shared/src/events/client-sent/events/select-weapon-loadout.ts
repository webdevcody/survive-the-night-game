import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";

/** 0 = primary, 1 = secondary, 2 = melee */
export interface SelectWeaponLoadoutEventData {
  loadout: number;
}

export class SelectWeaponLoadoutEvent implements GameEvent<SelectWeaponLoadoutEventData> {
  private readonly type: EventType = ClientSentEvents.SELECT_WEAPON_LOADOUT;
  private readonly data: SelectWeaponLoadoutEventData;

  constructor(data: SelectWeaponLoadoutEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SelectWeaponLoadoutEventData {
    return this.data;
  }

  static serializeToBuffer(writer: ArrayBufferWriter, data: SelectWeaponLoadoutEventData): void {
    const lo = Math.max(0, Math.min(2, Math.floor(data.loadout ?? 0)));
    writer.writeUInt8(lo);
  }

  static deserializeFromBuffer(reader: BufferReader): SelectWeaponLoadoutEventData {
    const loadout = reader.readUInt8();
    return { loadout: Math.max(0, Math.min(2, loadout)) };
  }
}
