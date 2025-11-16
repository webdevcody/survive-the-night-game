import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export interface BuildEventData {
  playerId: number;
  position: { x: number; y: number };
  soundType: string;
}

export class BuildEvent implements GameEvent<BuildEventData> {
  private readonly type: EventType;
  private readonly data: BuildEventData;

  constructor(data: BuildEventData) {
    this.type = ServerSentEvents.BUILD;
    this.data = data;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): BuildEventData {
    return this.data;
  }

  getData(): BuildEventData {
    return this.data;
  }

  getPlayerId(): number {
    return this.data.playerId;
  }

  getPosition(): { x: number; y: number } {
    return this.data.position;
  }

  getSoundType(): string {
    return this.data.soundType;
  }
}

