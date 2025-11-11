import { EventType, ServerSentEvents } from "../events";
import { GameEvent } from "@/events/types";
import { ResourceType } from "@/util/inventory";

interface PlayerPickedUpResourceEventData {
  playerId: string;
  resourceType: ResourceType;
}

export class PlayerPickedUpResourceEvent implements GameEvent<PlayerPickedUpResourceEventData> {
  private readonly type: EventType;
  private readonly playerId: string;
  private readonly resourceType: ResourceType;

  constructor(data: PlayerPickedUpResourceEventData) {
    this.type = ServerSentEvents.PLAYER_PICKED_UP_RESOURCE;
    this.playerId = data.playerId;
    this.resourceType = data.resourceType;
  }

  getType(): EventType {
    return this.type;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  getResourceType(): ResourceType {
    return this.resourceType;
  }

  serialize(): PlayerPickedUpResourceEventData {
    return {
      playerId: this.playerId,
      resourceType: this.resourceType,
    };
  }
}
