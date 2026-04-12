import { EventType, ClientSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { ArrayBufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { getConfig } from "../../../config";

/**
 * slot: 0 = primary, 1 = secondary, 2 = melee, 3 = consumable (key 4), 4 = consumable (key 5).
 * bagIndex 0 = clear assignment.
 */
export interface SetWeaponLoadoutSlotEventData {
  slot: number;
  bagIndex: number;
}

export class SetWeaponLoadoutSlotEvent implements GameEvent<SetWeaponLoadoutSlotEventData> {
  private readonly type: EventType = ClientSentEvents.SET_WEAPON_LOADOUT_SLOT;
  private readonly data: SetWeaponLoadoutSlotEventData;

  constructor(data: SetWeaponLoadoutSlotEventData) {
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): SetWeaponLoadoutSlotEventData {
    return this.data;
  }

   static serializeToBuffer(writer: ArrayBufferWriter, data: SetWeaponLoadoutSlotEventData): void {
    const max = getConfig().player.MAX_INVENTORY_SLOTS;
    const slot = Math.max(0, Math.min(4, Math.floor(data.slot ?? 0)));
    const bag = Math.max(0, Math.min(max, Math.floor(data.bagIndex ?? 0)));
    writer.writeUInt8(slot);
    writer.writeUInt8(bag);
  }

  static deserializeFromBuffer(reader: BufferReader): SetWeaponLoadoutSlotEventData {
    const slot = reader.readUInt8();
    const bagIndex = reader.readUInt8();
    return {
      slot: Math.max(0, Math.min(4, slot)),
      bagIndex,
    };
  }
}
