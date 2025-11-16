import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";

export type PlayerJoinedEventData = {
  displayName: string;
  playerId: number;
};

export class PlayerJoinedEvent implements GameEvent<PlayerJoinedEventData> {
  private readonly type: EventType;
  private readonly playerId: number;
  private readonly displayName: string;

  constructor(data: PlayerJoinedEventData) {
    this.type = ServerSentEvents.PLAYER_JOINED;
    this.playerId = data.playerId;
    this.displayName = data.displayName;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): number {
    return this.playerId;
  }

  serialize(): PlayerJoinedEventData {
    return {
      displayName: this.displayName,
      playerId: this.playerId,
    };
  }

  getDisplayName(): string {
    return this.displayName;
  }
}
