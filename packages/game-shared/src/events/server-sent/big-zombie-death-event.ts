import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class BigZombieDeathEvent implements GameEvent<number> {
  private readonly type: EventType = ServerSentEvents.BIG_ZOMBIE_DEATH;
  private readonly zombieId: number;

  constructor(zombieId: number) {
    this.zombieId = zombieId;
  }

  getType(): EventType {
    return this.type;
  }

  getZombieId(): number {
    return this.zombieId;
  }

  serialize(): number {
    return this.zombieId;
  }
}
