import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "@/events/events";
import Vector2 from "@/util/vector2";

export interface GrenadeExplodedEventData {
  position: Vector2;
}

export class GrenadeExplodedEvent implements GameEvent<GrenadeExplodedEventData> {
  private data: GrenadeExplodedEventData;

  constructor(data: GrenadeExplodedEventData) {
    this.data = data;
  }

  public getType() {
    return ServerSentEvents.GRENADE_EXPLODED;
  }

  public serialize() {
    return this.data;
  }
}
