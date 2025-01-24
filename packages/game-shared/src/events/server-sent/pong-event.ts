import { ServerSentEvents, EventType } from "../events";
import { GameEvent } from "../types";

export class PongEvent implements GameEvent<{ timestamp: number }> {
  private type: EventType;
  private data: { timestamp: number };

  constructor(timestamp: number) {
    this.type = ServerSentEvents.PONG;
    this.data = { timestamp };
  }

  getType(): EventType {
    return this.type;
  }

  getData(): { timestamp: number } {
    return this.data;
  }

  serialize(): { timestamp: number } {
    return this.data;
  }
}
