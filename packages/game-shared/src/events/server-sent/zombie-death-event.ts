import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export class ZombieDeathEvent implements GameEvent<number> {
  private readonly type: EventType;
  private readonly zombieId: number;

  constructor(zombieId: number) {
    this.type = ServerSentEvents.ZOMBIE_DEATH;
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
