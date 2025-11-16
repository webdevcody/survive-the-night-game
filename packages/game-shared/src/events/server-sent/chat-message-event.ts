export interface ChatMessageEventData {
  playerId: number;
  message: string;
}

export class ChatMessageEvent {
  private data: ChatMessageEventData;

  constructor(data: ChatMessageEventData) {
    this.data = data;
  }

  public getData(): ChatMessageEventData {
    return this.data;
  }

  public getPlayerId(): number {
    return this.data.playerId;
  }

  public getMessage(): string {
    return this.data.message;
  }
}
