import { GameEvent } from "@/events/types";
import { EventType, ServerSentEvents } from "../events";

export interface GameMessageEventData {
  message: string;
  color?: string;
}

export class GameMessageEvent implements GameEvent<GameMessageEventData> {
  private data: GameMessageEventData;
  private readonly type: EventType;

  constructor(data: GameMessageEventData) {
    this.data = data;
    this.type = ServerSentEvents.GAME_MESSAGE;
  }

  public getType(): EventType {
    return this.type;
  }

  public serialize(): GameMessageEventData {
    return this.data;
  }

  public getData(): GameMessageEventData {
    return this.data;
  }

  public getMessage(): string {
    return this.data.message;
  }

  public getColor(): string | undefined {
    return this.data.color;
  }
}
