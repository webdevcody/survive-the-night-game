import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export interface MapData {
  ground: number[][];
  collidables: number[][];
}

export class MapEvent implements GameEvent<MapData> {
  private readonly type: EventType;
  private readonly mapData: MapData;

  constructor(mapData: MapData) {
    this.type = ServerSentEvents.MAP;
    this.mapData = mapData;
  }

  getType(): EventType {
    return this.type;
  }

  getMapData(): MapData {
    return this.mapData;
  }

  serialize(): MapData {
    return this.mapData;
  }
}
