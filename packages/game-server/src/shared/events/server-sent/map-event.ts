import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class MapEvent implements GameEvent<number[][]> {
  private type: EventType;
  private map: number[][];

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

  serialize(): any {
    return this.map;
  }

  deserialize(data: any): MapEvent {
    return new MapEvent(data);
  }
}
