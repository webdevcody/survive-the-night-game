import { WeaponKey } from "@/shared/inventory";
import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

interface PlayerAttackedEventData {
  playerId: string;
  weaponKey: WeaponKey;
}

export class PlayerAttackedEvent implements GameEvent<PlayerAttackedEventData> {
  private readonly type: EventType = ServerSentEvents.PLAYER_ATTACKED;
  private readonly playerId: string;
  private readonly weaponKey: WeaponKey;

  constructor(data: PlayerAttackedEventData) {
    this.playerId = data.playerId;
    this.weaponKey = data.weaponKey;
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

  serialize(): PlayerAttackedEventData {
    return {
      playerId: this.playerId,
      weaponKey: this.weaponKey,
    };
  }
}
