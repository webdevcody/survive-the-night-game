import { GameState, getEntityById } from "@/state";
import { PlayerClient } from "@/entities/player";
import { CommandAutocomplete } from "./command-autocomplete";

const CHAT_FONT_SIZE = 18;
const CHAT_FONT_FAMILY = "Arial";
const CHAT_MONOSPACE_FONT_FAMILY = "Courier New, monospace";
const CHAT_TEXT_COLOR = "white";
const CHAT_INPUT_HEIGHT = 50;
const CHAT_BOTTOM_MARGIN = 210; // Distance from bottom of screen to chat input (above inventory bar)

interface ChatMessage {
  playerId: number;
  message: string;
  timestamp: number;
}

export class ChatWidget {
  private showChatInput: boolean = false;
  private chatInput: string = "";
  private chatMessages: ChatMessage[] = [];
  private messageHistory: string[] = [];
  private historyIndex: number = -1;
  private autocomplete: CommandAutocomplete;
  private readonly CHAT_MESSAGE_TIMEOUT = 10000;
  private readonly MAX_MESSAGE_LENGTH = 60;
  private readonly MAX_HISTORY_LENGTH = 50;
  private readonly CHAT_WIDTH = 840;
  private readonly CHARS_PER_LINE = 100;

  constructor() {
    this.autocomplete = new CommandAutocomplete();
  }

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
      this.autocomplete.reset(); // Reset autocomplete when closing
    } else {
      // Reset history navigation when opening chat
      this.historyIndex = -1;
    }
  }

  public updateChatInput(key: string, shiftKey: boolean = false): void {
    if (!this.showChatInput) return;

    // Handle Tab for autocomplete
    if (key === "Tab") {
      const completed = shiftKey
        ? this.autocomplete.handleShiftTab(this.chatInput)
        : this.autocomplete.handleTab(this.chatInput);
      if (completed !== null) {
        this.chatInput = completed;
      }
      return;
    }

    // Handle Escape to close autocomplete suggestions
    if (key === "Escape" && this.autocomplete.isActive()) {
      this.autocomplete.reset();
      return;
    }

    if (key === "Backspace") {
      this.chatInput = this.chatInput.slice(0, -1);
      this.autocomplete.handleInput(this.chatInput);
    } else if (key === "ArrowUp") {
      // If autocomplete is active, navigate suggestions; otherwise navigate history
      if (this.autocomplete.isActive()) {
        const completed = this.autocomplete.handleArrowUp();
        if (completed !== null) {
          this.chatInput = completed;
        }
      } else {
        this.navigateHistory(1);
      }
    } else if (key === "ArrowDown") {
      // If autocomplete is active, navigate suggestions; otherwise navigate history
      if (this.autocomplete.isActive()) {
        const completed = this.autocomplete.handleArrowDown();
        if (completed !== null) {
          this.chatInput = completed;
        }
      } else {
        this.navigateHistory(-1);
      }
    } else if (key.length === 1 && this.chatInput.length < this.MAX_MESSAGE_LENGTH) {
      this.chatInput += key;
      this.autocomplete.handleInput(this.chatInput);
      // Reset history navigation when user types
      this.historyIndex = -1;
    }
  }

  private navigateHistory(direction: number): void {
    if (this.messageHistory.length === 0) return;

    const newIndex = this.historyIndex + direction;

    // Clamp the index between -1 (current input) and history length - 1 (oldest message)
    if (newIndex >= -1 && newIndex < this.messageHistory.length) {
      this.historyIndex = newIndex;

      if (this.historyIndex === -1) {
        // Reset to empty input
        this.chatInput = "";
      } else {
        // Load message from history (most recent first)
        this.chatInput = this.messageHistory[this.historyIndex];
      }
    }
  }

  public getChatInput(): string {
    return this.chatInput;
  }

  public clearChatInput(): void {
    this.chatInput = "";
  }

  public saveChatMessage(message: string): void {
    if (message.trim() === "") return;

    // Add to history (most recent first)
    this.messageHistory.unshift(message);

    // Limit history size
    if (this.messageHistory.length > this.MAX_HISTORY_LENGTH) {
      this.messageHistory = this.messageHistory.slice(0, this.MAX_HISTORY_LENGTH);
    }

    // Reset history index
    this.historyIndex = -1;
  }

  public addChatMessage(playerId: number, message: string): void {
    // Only truncate user messages, not system messages (system messages use playerId 0)
    const isSystem = playerId === 0;
    const truncatedMessage = isSystem ? message : message.slice(0, this.MAX_MESSAGE_LENGTH);

    this.chatMessages.push({
      playerId,
      message: truncatedMessage,
      timestamp: Date.now(),
    });
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderChatMessages(ctx, gameState);
    this.renderChatInput(ctx);
    this.renderAutocompleteSuggestions(ctx);
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
      // For system messages (playerId 0), don't prepend username
      let text: string;
      const isSystem = chat.playerId === 0;
      if (isSystem) {
        text = chat.message;
      } else {
        // Get the player entity by ID to get their display name
        const entity = getEntityById(gameState, chat.playerId);
        const userName =
          entity instanceof PlayerClient ? entity.getDisplayName() : "Unknown";
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

  private renderAutocompleteSuggestions(ctx: CanvasRenderingContext2D): void {
    if (!this.showChatInput || !this.autocomplete.isActive()) return;

    const suggestions = this.autocomplete.getSuggestions();
    const selectedIndex = this.autocomplete.getSelectedIndex();

    if (suggestions.length === 0) return;

    const width = this.CHAT_WIDTH;
    const x = (ctx.canvas.width - width) / 2;

    const lineHeight = 28;
    const padding = 8;
    const hintHeight = 24; // Space for the hint text at the bottom
    const height = suggestions.length * lineHeight + padding * 2 + hintHeight;

    // Position above the chat input instead of below
    const y = ctx.canvas.height - CHAT_BOTTOM_MARGIN - height - 4;

    // Draw background
    ctx.fillStyle = "rgba(30, 30, 30, 0.95)";
    this.roundRect(ctx, x, y, width, height, 8);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = "rgba(100, 100, 100, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(ctx, x, y, width, height, 8);
    ctx.stroke();

    // Draw suggestions
    ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`;

    suggestions.forEach((suggestion, index) => {
      const itemY = y + padding + index * lineHeight;

      // Highlight selected item
      if (index === selectedIndex) {
        ctx.fillStyle = "rgba(60, 120, 200, 0.5)";
        ctx.fillRect(x + 4, itemY, width - 8, lineHeight);
      }

      // Draw suggestion text
      ctx.fillStyle = index === selectedIndex ? "white" : "rgba(200, 200, 200, 0.9)";
      ctx.fillText(suggestion, x + padding, itemY + lineHeight / 2 + 6);
    });

    // Draw hint at bottom with more spacing
    ctx.fillStyle = "rgba(150, 150, 150, 0.7)";
    ctx.font = `12px ${CHAT_FONT_FAMILY}`;
    ctx.fillText("↑↓ or Tab to cycle, Escape to close", x + padding, y + height - 8);
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
