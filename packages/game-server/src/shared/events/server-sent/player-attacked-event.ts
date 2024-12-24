import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class PlayerAttackedEvent implements GameEvent<string> {
  private type: EventType;
  private playerId: string;
  private weaponKey: string;

  constructor(playerId: string, weaponKey: string) {
    this.type = ServerSentEvents.PLAYER_ATTACKED;
    this.playerId = playerId;
    this.weaponKey = weaponKey;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.playerId;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getWeaponKey(): string {
    return this.weaponKey;
  }

  deserialize(data: any): PlayerAttackedEvent {
    return new PlayerAttackedEvent(data);
  }
}
