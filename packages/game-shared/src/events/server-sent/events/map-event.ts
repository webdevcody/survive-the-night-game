import { EventType, ServerSentEvents } from "../../events";
import { GameEvent } from "@/events/types";

export interface MapData {
  ground: number[][];
  collidables: number[][];
  biomePositions?: {
    campsite: { x: number; y: number };
    farm?: { x: number; y: number };
    gasStation?: { x: number; y: number };
    city?: { x: number; y: number };
    dock?: { x: number; y: number };
    shed?: { x: number; y: number };
    merchants?: Array<{ x: number; y: number }>;
  };
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
