import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "../types";

export class ZombieHurtEvent implements GameEvent<string> {
  private type: EventType;
  private zombieId: string;

  constructor(zombieId: string) {
    this.type = ServerSentEvents.ZOMBIE_HURT;
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

  deserialize(data: any): ZombieHurtEvent {
    return new ZombieHurtEvent(data.zombieId);
  }
}
