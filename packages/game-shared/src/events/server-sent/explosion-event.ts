import { GameEvent } from "@/events/types";
import { ServerSentEvents } from "@/events/events";
import Vector2 from "@/util/vector2";

export interface ExplosionEventData {
  position: Vector2;
}

export class ExplosionEvent implements GameEvent<ExplosionEventData> {
  private data: ExplosionEventData;

  constructor(data: ExplosionEventData) {
    this.data = data;
  }

  public getType() {
    return ServerSentEvents.EXPLOSION;
  }

  public serialize() {
    return this.data;
  }
}
