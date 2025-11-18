import { WeaponKey } from "@/util/inventory";
import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";

export class GunFiredEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly entityId: number;
  private readonly weaponKey: WeaponKey;

  constructor(entityId: number, weaponKey: WeaponKey) {
    this.type = ServerSentEvents.GUN_FIRED;
    this.entityId = entityId;
    this.weaponKey = weaponKey;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): number {
    return this.entityId;
  }

  getEntityId(): number {
    return this.entityId;
  }

  static serializeToBuffer(writer: BufferWriter, data: number): void {
    writer.writeUInt16(data);
  }

  static deserializeFromBuffer(reader: BufferReader): number {
    return reader.readUInt16();
  }
}
