import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class ServerUpdatingEvent implements GameEvent<void> {
  private readonly type: EventType;

  constructor() {
    this.type = ServerSentEvents.SERVER_UPDATING;
  }

  getType(): EventType {
    return this.type;
  }

  serialize(): void {
    return;
  }
}