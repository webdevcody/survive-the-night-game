import { EventType, ServerSentEvents } from "@/events/events";
import { GameEvent } from "@/events/types";

export class ZombieHurtEvent implements GameEvent<string> {
  private readonly type: EventType = ServerSentEvents.ZOMBIE_HURT;
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
