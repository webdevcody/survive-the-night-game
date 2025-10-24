import { GameState, getEntityById } from "@/state";
import { PlayerClient } from "@/entities/player";

const CHAT_FONT_SIZE = 24;
const CHAT_FONT_FAMILY = "Arial";
const CHAT_MONOSPACE_FONT_FAMILY = "Courier New, monospace";
const CHAT_TEXT_COLOR = "white";
const CHAT_INPUT_HEIGHT = 50;
const CHAT_BOTTOM_MARGIN = 180; // Distance from bottom of screen to chat input

interface ChatMessage {
  playerId: string;
  message: string;
  timestamp: number;
}

export class ChatWidget {
  private showChatInput: boolean = false;
  private chatInput: string = "";
  private chatMessages: ChatMessage[] = [];
  private readonly CHAT_MESSAGE_TIMEOUT = 10000;
  private readonly MAX_MESSAGE_LENGTH = 60;
  private readonly CHAT_WIDTH = 800;
  private readonly CHARS_PER_LINE = 100;

  constructor() {}

  public update(): void {
    // Clean up old messages
    const now = Date.now();
    this.chatMessages = this.chatMessages.filter(
      (message) => now - message.timestamp < this.CHAT_MESSAGE_TIMEOUT
    );
  }

  public toggleChatInput(): void {
    this.showChatInput = !this.showChatInput;
    if (!this.showChatInput) {
      this.chatInput = ""; // Clear input when closing
    }
  }

  public updateChatInput(key: string): void {
    if (!this.showChatInput) return;

    if (key === "Backspace") {
      this.chatInput = this.chatInput.slice(0, -1);
    } else if (key.length === 1 && this.chatInput.length < this.MAX_MESSAGE_LENGTH) {
      this.chatInput += key;
    }
  }

  public getChatInput(): string {
    return this.chatInput;
  }

  public clearChatInput(): void {
    this.chatInput = "";
  }

  public addChatMessage(playerId: string, message: string): void {
    // Only truncate user messages, not system messages
    const truncatedMessage = playerId === "system" ? message : message.slice(0, this.MAX_MESSAGE_LENGTH);

    this.chatMessages.push({
      playerId,
      message: truncatedMessage,
      timestamp: Date.now(),
    });
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderChatMessages(ctx, gameState);
    this.renderChatInput(ctx);
  }

  private wrapText(text: string): string[] {
    const allLines: string[] = [];

    // First, split by explicit newline characters
    const textLines = text.split("\n");

    // Then apply word wrapping to each line
    for (const textLine of textLines) {
      const wrappedLines = this.wrapSingleLine(textLine);
      allLines.push(...wrappedLines);
    }

    return allLines;
  }

  private wrapSingleLine(text: string): string[] {
    const lines: string[] = [];
    let currentLine = "";
    let currentLineChars = 0;
    const words = text.split(" ");

    for (const word of words) {
      if (currentLineChars + word.length + 1 > this.CHARS_PER_LINE) {
        if (currentLine) {
          lines.push(currentLine.trim());
          currentLine = word + " ";
          currentLineChars = word.length + 1;
        } else {
          // If a single word is longer than CHARS_PER_LINE, split it
          lines.push(word.slice(0, this.CHARS_PER_LINE));
          currentLine = word.slice(this.CHARS_PER_LINE) + " ";
          currentLineChars = currentLine.length;
        }
      } else {
        currentLine += word + " ";
        currentLineChars += word.length + 1;
      }
    }

    if (currentLine) {
      lines.push(currentLine.trim());
    }

    // If no lines were created (empty string), add an empty line
    if (lines.length === 0) {
      lines.push("");
    }

    return lines;
  }

  private renderChatMessages(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const messages = [...this.chatMessages];
    const lineHeight = 32;
    const maxMessages = 8;
    const padding = 20;
    const width = this.CHAT_WIDTH;

    // Process messages and calculate total height
    const processedMessages = messages.slice(-maxMessages).map((chat) => {
      // For system messages, don't prepend username
      let text: string;
      const isSystem = chat.playerId === "system";
      if (isSystem) {
        text = chat.message;
      } else {
        // Get the player entity by ID to get their display name
        const player = getEntityById(gameState, chat.playerId) as PlayerClient;
        const userName = player?.getDisplayName() ?? "Unknown";
        text = `${userName}: ${chat.message}`;
      }
      const lines = this.wrapText(text);
      return { ...chat, lines, lineCount: lines.length, isSystem };
    });

    // Calculate total height based on actual content
    const totalHeight =
      processedMessages.reduce((acc, msg) => acc + msg.lineCount * lineHeight, 0) + padding * 2;

    // Position the chat box above the inventory bar
    const y = ctx.canvas.height - CHAT_BOTTOM_MARGIN - totalHeight;

    // Draw background
    if (messages.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.roundRect(ctx, (ctx.canvas.width - width) / 2, y - 16, width, totalHeight, 8);
      ctx.fill();
    }

    // Draw messages starting from the bottom
    ctx.fillStyle = CHAT_TEXT_COLOR;

    // Start at the bottom of the widget (minus padding)
    let currentY = ctx.canvas.height - CHAT_BOTTOM_MARGIN - padding;

    // Render messages in reverse order, moving upwards
    for (let i = processedMessages.length - 1; i >= 0; i--) {
      const chat = processedMessages[i];

      // Use monospace font for system messages, regular font for user messages
      ctx.font = chat.isSystem
        ? `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`
        : `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;

      // Move up by the height of all lines in this message
      currentY -= chat.lineCount * lineHeight;

      // Render each line of the message
      chat.lines.forEach((line) => {
        ctx.fillText(line, (ctx.canvas.width - width) / 2 + padding, currentY);
        currentY += lineHeight;
      });
      // Move back up to prepare for the next message
      currentY -= chat.lineCount * lineHeight;
    }
  }

  private renderChatInput(ctx: CanvasRenderingContext2D): void {
    if (!this.showChatInput) return;

    const width = this.CHAT_WIDTH;
    const x = (ctx.canvas.width - width) / 2;
    const y = ctx.canvas.height - CHAT_BOTTOM_MARGIN;

    // Draw input background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.roundRect(ctx, x, y, width, CHAT_INPUT_HEIGHT, 8);
    ctx.fill();

    // Draw input text
    ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
    ctx.fillStyle = CHAT_TEXT_COLOR;
    const text = this.chatInput + "▌";
    const textY = y + CHAT_INPUT_HEIGHT / 2 + 6;
    ctx.fillText(text, x + 10, textY);

    // Draw placeholder text if empty
    if (!this.chatInput) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Press Enter to send, Esc to cancel", x + 10, textY);
    }

    // Draw character count if typing
    if (this.chatInput) {
      const charCount = `${this.chatInput.length}/${this.MAX_MESSAGE_LENGTH}`;
      const charCountWidth = ctx.measureText(charCount).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(charCount, x + width - charCountWidth - 10, textY);
    }
  }

  // Helper method for drawing rounded rectangles
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    topRounded: boolean = true,
    bottomRounded: boolean = true
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    if (topRounded) {
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    } else {
      ctx.lineTo(x + width, y);
    }
    ctx.lineTo(x + width, y + height - radius);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    } else {
      ctx.lineTo(x + width, y + height);
    }
    ctx.lineTo(x + radius, y + height);
    if (bottomRounded) {
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    } else {
      ctx.lineTo(x, y + height);
    }
    ctx.lineTo(x, y + radius);
    if (topRounded) {
      ctx.quadraticCurveTo(x, y, x + radius, y);
    } else {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
}
