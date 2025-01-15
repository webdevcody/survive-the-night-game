import { EventType, ServerSentEvents } from "@/events/events";
import { GameEvent } from "@/events/types";

export class ZombieDeathEvent implements GameEvent<string> {
  private readonly type: EventType;
  private readonly zombieId: string;

  constructor(zombieId: string) {
    this.type = ServerSentEvents.ZOMBIE_DEATH;
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
