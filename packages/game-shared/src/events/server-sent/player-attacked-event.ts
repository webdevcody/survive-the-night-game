import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";
import { WeaponKey } from "../../util/inventory";
import { Direction } from "../../util/direction";

interface PlayerAttackedEventData {
  playerId: string;
  weaponKey: WeaponKey;
  attackDirection?: Direction;
}

export class PlayerAttackedEvent implements GameEvent<PlayerAttackedEventData> {
  private readonly type: EventType = ServerSentEvents.PLAYER_ATTACKED;
  private readonly playerId: string;
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

  getPlayerId(): string {
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
}
