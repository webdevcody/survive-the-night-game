import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "../../types";
import { WeaponKey } from "../../../util/inventory";
import { Direction } from "../../../util/direction";
import { BufferWriter, BufferReader } from "../../../util/buffer-serialization";
import { itemTypeRegistry } from "../../../util/item-type-encoding";

interface PlayerAttackedEventData {
  playerId: number;
  weaponKey: WeaponKey;
  attackDirection?: Direction;
}

export class PlayerAttackedEvent implements GameEvent<PlayerAttackedEventData> {
  private readonly type: EventType = ServerSentEvents.PLAYER_ATTACKED;
  private readonly playerId: number;
  private readonly weaponKey: WeaponKey;
  private readonly attackDirection?: Direction;

  constructor(data: PlayerAttackedEventData) {
    this.playerId = data.playerId;
    this.weaponKey = data.weaponKey;
    this.attackDirection = data.attackDirection;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  getWeaponKey(): WeaponKey {
    return this.weaponKey;
  }

  getAttackDirection(): Direction | undefined {
    return this.attackDirection;
  }

  serialize(): PlayerAttackedEventData {
    return {
      playerId: this.playerId,
      weaponKey: this.weaponKey,
      attackDirection: this.attackDirection,
    };
  }

  static serializeToBuffer(writer: BufferWriter, data: PlayerAttackedEventData): void {
    writer.writeUInt16(data.playerId);
    writer.writeUInt8(itemTypeRegistry.encode(data.weaponKey));
    writer.writeUInt8(data.attackDirection !== undefined ? 1 : 0);
    if (data.attackDirection !== undefined) {
      writer.writeUInt8(data.attackDirection);
    }
  }

  static deserializeFromBuffer(reader: BufferReader): PlayerAttackedEventData {
    const playerId = reader.readUInt16();
    const weaponKey = itemTypeRegistry.decode(reader.readUInt8()) as WeaponKey;
    const hasDirection = reader.readUInt8() === 1;
    const attackDirection = hasDirection ? reader.readUInt8() : undefined;
    return { playerId, weaponKey, attackDirection };
  }
}
