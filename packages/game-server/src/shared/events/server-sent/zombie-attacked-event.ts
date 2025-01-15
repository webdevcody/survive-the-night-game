import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class ZombieAttackedEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly zombieId: string;

  constructor(zombieId: string) {
    this.type = ServerSentEvents.ZOMBIE_ATTACKED;
    this.zombieId = zombieId;
  }

  getType(): EventType {
    return this.type;
  }

  getZombieId(): string {
    return this.zombieId;
  }

  serialize(): string {
    return this.zombieId;
  }
}
