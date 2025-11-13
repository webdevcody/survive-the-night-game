import { WeaponKey } from "@/util/inventory";
import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class GunFiredEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly entityId: string;
  private readonly weaponKey: WeaponKey;

  constructor(entityId: string, weaponKey: WeaponKey) {
    this.type = ServerSentEvents.GUN_FIRED;
    this.entityId = entityId;
    this.weaponKey = weaponKey;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): string {
    return this.entityId;
  }

  getEntityId(): string {
    return this.entityId;
  }
}
