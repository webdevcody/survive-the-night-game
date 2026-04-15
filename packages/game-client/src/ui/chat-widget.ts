import { GameState, getEntityById } from "@/state";
import { PlayerClient } from "@/entities/player";
import { CommandAutocomplete } from "./command-autocomplete";

const CHAT_FONT_SIZE = 14;
const CHAT_FONT_FAMILY = "Arial";
const CHAT_MONOSPACE_FONT_FAMILY = "Courier New, monospace";
const CHAT_TEXT_COLOR = "white";
const CHAT_INPUT_HEIGHT = 44;
/** Max panel width; messages wrap to this width minus padding. */
const CHAT_PANEL_MAX_WIDTH = 200;
const CHAT_LEFT_MARGIN = 12;
const CHAT_BOTTOM_MARGIN = 210; // Distance from bottom of screen to chat input (above inventory bar)
const CHAT_TOGGLE_BTN = { w: 88, h: 32, left: 12, bottom: 12 } as const;

interface ChatMessage {
  playerId: number;
  message: string;
  timestamp: number;
}

export class ChatWidget {
  private showChatInput: boolean = false;
  /** Message list + input (when open); toggle button is always visible. */
  private chatPanelOpen: boolean = true;
  private chatInput: string = "";
  private chatMessages: ChatMessage[] = [];
  private messageHistory: string[] = [];
  private historyIndex: number = -1;
  private autocomplete: CommandAutocomplete;
  private readonly CHAT_MESSAGE_TIMEOUT = 10000;
  private readonly MAX_MESSAGE_LENGTH = 60;
  private readonly MAX_HISTORY_LENGTH = 50;

  constructor() {
    this.autocomplete = new CommandAutocomplete();
  }

  public update(): void {
    const now = Date.now();
    this.chatMessages = this.chatMessages.filter(
      (message) => now - message.timestamp < this.CHAT_MESSAGE_TIMEOUT
    );
  }

  public toggleChatInput(): void {
    this.showChatInput = !this.showChatInput;
    if (!this.showChatInput) {
      this.chatInput = "";
      this.autocomplete.reset();
    } else {
      this.chatPanelOpen = true;
      this.historyIndex = -1;
    }
  }

  public toggleChatPanel(): void {
    this.chatPanelOpen = !this.chatPanelOpen;
    if (!this.chatPanelOpen) {
      this.showChatInput = false;
      this.chatInput = "";
      this.autocomplete.reset();
    }
  }

  /**
   * Bottom-left toggle: returns true if the click was consumed.
   */
  public handleToggleButtonClick(x: number, y: number, canvasHeight: number): boolean {
    const b = this.getToggleButtonRect(canvasHeight);
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) {
      return false;
    }
    this.toggleChatPanel();
    return true;
  }

  public updateChatInput(key: string, shiftKey: boolean = false): void {
    if (!this.showChatInput) return;

    if (key === "Tab") {
      const completed = shiftKey
        ? this.autocomplete.handleShiftTab(this.chatInput)
        : this.autocomplete.handleTab(this.chatInput);
      if (completed !== null) {
        this.chatInput = completed;
      }
      return;
    }

    if (key === "Escape" && this.autocomplete.isActive()) {
      this.autocomplete.reset();
      return;
    }

    if (key === "Backspace") {
      this.chatInput = this.chatInput.slice(0, -1);
      this.autocomplete.handleInput(this.chatInput);
    } else if (key === "ArrowUp") {
      if (this.autocomplete.isActive()) {
        const completed = this.autocomplete.handleArrowUp();
        if (completed !== null) {
          this.chatInput = completed;
        }
      } else {
        this.navigateHistory(1);
      }
    } else if (key === "ArrowDown") {
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
      this.historyIndex = -1;
    }
  }

  private navigateHistory(direction: number): void {
    if (this.messageHistory.length === 0) return;

    const newIndex = this.historyIndex + direction;

    if (newIndex >= -1 && newIndex < this.messageHistory.length) {
      this.historyIndex = newIndex;

      if (this.historyIndex === -1) {
        this.chatInput = "";
      } else {
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

    this.messageHistory.unshift(message);

    if (this.messageHistory.length > this.MAX_HISTORY_LENGTH) {
      this.messageHistory = this.messageHistory.slice(0, this.MAX_HISTORY_LENGTH);
    }

    this.historyIndex = -1;
  }

  public addChatMessage(playerId: number, message: string): void {
    const isSystem = playerId === 0;
    const truncatedMessage = isSystem ? message : message.slice(0, this.MAX_MESSAGE_LENGTH);

    this.chatMessages.push({
      playerId,
      message: truncatedMessage,
      timestamp: Date.now(),
    });
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderChatToggleButton(ctx);
    if (!this.chatPanelOpen) {
      return;
    }
    this.renderChatMessages(ctx, gameState);
    this.renderChatInput(ctx);
    this.renderAutocompleteSuggestions(ctx);
  }

  private getPanelX(): number {
    return CHAT_LEFT_MARGIN;
  }

  private getToggleButtonRect(canvasHeight: number): { x: number; y: number; w: number; h: number } {
    return {
      x: CHAT_TOGGLE_BTN.left,
      y: canvasHeight - CHAT_TOGGLE_BTN.bottom - CHAT_TOGGLE_BTN.h,
      w: CHAT_TOGGLE_BTN.w,
      h: CHAT_TOGGLE_BTN.h,
    };
  }

  private renderChatToggleButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.getToggleButtonRect(ctx.canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    this.fillRoundRect(ctx, x, y, w, h, 6);
    ctx.strokeStyle = "rgba(200, 200, 200, 0.5)";
    ctx.lineWidth = 1;
    this.strokeRoundRect(ctx, x, y, w, h, 6);
    ctx.font = `12px ${CHAT_FONT_FAMILY}`;
    ctx.fillStyle = CHAT_TEXT_COLOR;
    const label = this.chatPanelOpen ? "Hide chat" : "Chat";
    ctx.fillText(label, x + 10, y + h / 2 + 4);
  }

  /** Word-wrap using the active canvas font so lines fit `maxWidth`. */
  private wrapTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const result: string[] = [];
    for (const para of text.split("\n")) {
      if (para === "") {
        result.push("");
        continue;
      }
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        if (!word) continue;
        const testLine = line ? `${line} ${word}` : word;
        if (ctx.measureText(testLine).width <= maxWidth) {
          line = testLine;
          continue;
        }
        if (line) {
          result.push(line);
          line = "";
        }
        if (ctx.measureText(word).width <= maxWidth) {
          line = word;
        } else {
          let part = "";
          for (const ch of word) {
            const next = part + ch;
            if (ctx.measureText(next).width <= maxWidth) {
              part = next;
            } else {
              if (part) result.push(part);
              part = ch;
            }
          }
          line = part;
        }
      }
      if (line) result.push(line);
    }
    return result.length > 0 ? result : [""];
  }

  private renderChatMessages(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const messages = [...this.chatMessages];
    const lineHeight = 20;
    const maxMessages = 8;
    const padding = 10;
    const width = CHAT_PANEL_MAX_WIDTH;
    const panelX = this.getPanelX();
    const textMaxWidth = width - padding * 2;

    const processedMessages = messages.slice(-maxMessages).map((chat) => {
      let text: string;
      const isSystem = chat.playerId === 0;
      if (isSystem) {
        text = chat.message;
      } else {
        const entity = getEntityById(gameState, chat.playerId);
        const userName =
          entity instanceof PlayerClient ? entity.getDisplayName() : "Unknown";
        text = `${userName}: ${chat.message}`;
      }
      ctx.font = isSystem
        ? `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`
        : `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
      const lines = this.wrapTextToWidth(ctx, text, textMaxWidth);
      return { ...chat, lines, lineCount: lines.length, isSystem };
    });

    const totalHeight =
      processedMessages.reduce((acc, msg) => acc + msg.lineCount * lineHeight, 0) + padding * 2;

    const toggleReserve =
      CHAT_TOGGLE_BTN.bottom + CHAT_TOGGLE_BTN.h + 10;
    const maxBottom = ctx.canvas.height - toggleReserve;
    let blockTop = Math.max(
      48,
      Math.round((ctx.canvas.height - totalHeight) / 2),
    );
    if (blockTop + totalHeight > maxBottom) {
      blockTop = Math.max(48, maxBottom - totalHeight);
    }

    if (messages.length > 0) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.fillRoundRect(ctx, panelX, blockTop, width, totalHeight, 8);
    }

    ctx.fillStyle = CHAT_TEXT_COLOR;
    let currentY = blockTop + padding;

    for (const chat of processedMessages) {
      ctx.font = chat.isSystem
        ? `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`
        : `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;

      for (const line of chat.lines) {
        ctx.fillText(line, panelX + padding, currentY + CHAT_FONT_SIZE);
        currentY += lineHeight;
      }
    }
  }

  private renderChatInput(ctx: CanvasRenderingContext2D): void {
    if (!this.showChatInput) return;

    const width = CHAT_PANEL_MAX_WIDTH;
    const x = this.getPanelX();
    const y = ctx.canvas.height - CHAT_BOTTOM_MARGIN;

    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.fillRoundRect(ctx, x, y, width, CHAT_INPUT_HEIGHT, 8);

    ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
    const textY = y + CHAT_INPUT_HEIGHT / 2 + 5;
    const textX = x + 8;
    const textClipW = width - 16;

    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, y + 4, textClipW, CHAT_INPUT_HEIGHT - 8);
    ctx.clip();

    if (!this.chatInput) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Enter send · Esc cancel", textX, textY);
    } else {
      ctx.fillStyle = CHAT_TEXT_COLOR;
      ctx.fillText(this.chatInput + "\u258C", textX, textY);
    }
    ctx.restore();

    if (this.chatInput) {
      ctx.font = `11px ${CHAT_FONT_FAMILY}`;
      const charCount = `${this.chatInput.length}/${this.MAX_MESSAGE_LENGTH}`;
      const charCountWidth = ctx.measureText(charCount).width;
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText(charCount, x + width - charCountWidth - 8, y + CHAT_INPUT_HEIGHT - 6);
    }
  }

  private renderAutocompleteSuggestions(ctx: CanvasRenderingContext2D): void {
    if (!this.showChatInput || !this.autocomplete.isActive()) return;

    const suggestions = this.autocomplete.getSuggestions();
    const selectedIndex = this.autocomplete.getSelectedIndex();

    if (suggestions.length === 0) return;

    const width = CHAT_PANEL_MAX_WIDTH;
    const x = this.getPanelX();

    const lineHeight = 24;
    const padding = 8;
    const hintHeight = 22;
    const height = suggestions.length * lineHeight + padding * 2 + hintHeight;

    const y = ctx.canvas.height - CHAT_BOTTOM_MARGIN - height - 4;

    ctx.fillStyle = "rgba(30, 30, 30, 0.95)";
    this.fillRoundRect(ctx, x, y, width, height, 8);

    ctx.strokeStyle = "rgba(100, 100, 100, 0.8)";
    ctx.lineWidth = 1;
    this.strokeRoundRect(ctx, x, y, width, height, 8);

    ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`;

    suggestions.forEach((suggestion, index) => {
      const itemY = y + padding + index * lineHeight;

      if (index === selectedIndex) {
        ctx.fillStyle = "rgba(60, 120, 200, 0.5)";
        ctx.fillRect(x + 4, itemY, width - 8, lineHeight);
      }

      ctx.fillStyle = index === selectedIndex ? "white" : "rgba(200, 200, 200, 0.9)";
      const lines = this.wrapTextToWidth(ctx, suggestion, width - padding * 2 - 4);
      ctx.fillText(lines[0] ?? "", x + padding, itemY + lineHeight / 2 + 5);
    });

    ctx.fillStyle = "rgba(150, 150, 150, 0.7)";
    ctx.font = `11px ${CHAT_FONT_FAMILY}`;
    ctx.fillText("↑↓ Tab · Esc close", x + padding, y + height - 6);
  }

  private addRoundRectPath(
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
  }

  private fillRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    topRounded: boolean = true,
    bottomRounded: boolean = true
  ): void {
    this.addRoundRectPath(ctx, x, y, width, height, radius, topRounded, bottomRounded);
    ctx.fill();
  }

  private strokeRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    topRounded: boolean = true,
    bottomRounded: boolean = true
  ): void {
    this.addRoundRectPath(ctx, x, y, width, height, radius, topRounded, bottomRounded);
    ctx.stroke();
  }
}
