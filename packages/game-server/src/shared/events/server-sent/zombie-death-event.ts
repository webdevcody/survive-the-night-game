import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class ZombieDeathEvent implements GameEvent<string> {
  private type: EventType;
  private zombieId: string;

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

  serialize(): any {
    return {
      zombieId: this.zombieId,
    };
  }

  deserialize(data: any): ZombieDeathEvent {
    return new ZombieDeathEvent(data.zombieId);
  }
}
