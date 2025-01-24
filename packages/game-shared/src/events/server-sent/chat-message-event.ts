export interface ChatMessageEventData {
  playerId: string;
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

  public getPlayerId(): string {
    return this.data.playerId;
  }

  public getMessage(): string {
    return this.data.message;
  }
}
