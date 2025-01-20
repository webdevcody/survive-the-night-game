import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class BigZombieAttackedEvent implements GameEvent<string> {
  private readonly type: EventType = ServerSentEvents.BIG_ZOMBIE_ATTACKED;
  private readonly zombieId: string;

  constructor(zombieId: string) {
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
