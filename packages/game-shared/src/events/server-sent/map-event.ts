import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class MapEvent implements GameEvent<number[][]> {
  private readonly type: EventType;
  private readonly map: number[][];

  constructor(map: number[][]) {
    this.type = ServerSentEvents.MAP;
    this.map = map;
  }

  getType(): EventType {
    return this.type;
  }

  getMap(): number[][] {
    return this.map;
  }

  serialize(): number[][] {
    return this.map;
  }
}
