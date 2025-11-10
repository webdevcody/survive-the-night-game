import { GameState } from "@/state";
import { Panel, PanelSettings } from "./panel";

export interface GameMessagesPanelSettings extends PanelSettings {
  font: string;
  textColor: string;
  top: number;
  gap: number;
  messageTimeout: number;
}

interface GameMessage {
  message: string;
  timestamp: number;
  color?: string;
}

export class GameMessagesPanel extends Panel {
  private messagesSettings: GameMessagesPanelSettings;
  private gameMessages: GameMessage[] = [];

  constructor(settings: GameMessagesPanelSettings) {
    super(settings);
    this.messagesSettings = settings;
  }

  public addMessage(message: string, color?: string): void {
    this.gameMessages.push({
      message,
      timestamp: Date.now(),
      color,
    });
  }

  public update(): void {
    // Remove expired messages
    this.gameMessages = this.gameMessages.filter(
      (message) => Date.now() - message.timestamp < this.messagesSettings.messageTimeout
    );
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (this.gameMessages.length === 0) {
      return;
    }

    this.resetTransform(ctx);

    ctx.font = this.messagesSettings.font;

    this.gameMessages.forEach((message, index) => {
      // Use message-specific color or fall back to default
      ctx.fillStyle = message.color || this.messagesSettings.textColor;
      const metrics = ctx.measureText(message.message);
      const x = (ctx.canvas.width - metrics.width) / 2;
      const y = this.messagesSettings.top + index * this.messagesSettings.gap;
      ctx.fillText(message.message, x, y);
    });

    this.restoreContext(ctx);
  }
}
