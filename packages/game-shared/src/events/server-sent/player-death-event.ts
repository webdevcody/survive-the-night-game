import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export type PlayerDeathEventData = {
  playerId: string;
  displayName: string;
};

export class PlayerDeathEvent implements GameEvent<PlayerDeathEventData> {
  private readonly type: EventType;
  private readonly playerId: string;
  private readonly displayName: string;

  constructor(data: PlayerDeathEventData) {
    this.type = ServerSentEvents.PLAYER_DEATH;
    this.playerId = data.playerId;
    this.displayName = data.displayName;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getDisplayName(): string {
    return this.displayName;
  }

  serialize(): PlayerDeathEventData {
    return {
      playerId: this.playerId,
      displayName: this.displayName,
    };
  }
}
