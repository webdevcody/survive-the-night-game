import { formatDistanceToNow } from "date-fns";
import { GameState, getEntityById } from "@/state";
import { PlayerClient } from "@/entities/player";
import { drawHudFlatPanel, RPG_METADATA_MUTED, RPG_TITLE_CREAM } from "@/ui/rpg-hud-theme";
import { scaleHudValue } from "@/util/hud-scale";
import { CommandAutocomplete } from "./command-autocomplete";

const CHAT_FONT_SIZE = 14;
const CHAT_META_FONT_SIZE = 11;
const CHAT_FONT_FAMILY = "Arial";
const CHAT_MONOSPACE_FONT_FAMILY = "Courier New, monospace";
const CHAT_TEXT_COLOR = "white";
const CHAT_INPUT_HEIGHT = 44;
const CHAT_META_LINE_HEIGHT = 15;
const CHAT_BODY_LINE_HEIGHT = 20;
/** Shared width for message viewport + input + autocomplete (matches HUD flat panel chrome). */
const CHAT_PANEL_MAX_WIDTH = 300;
const CHAT_INPUT_PLACEHOLDER = "Press Y to chat";
const CHAT_LEFT_MARGIN = 12;
/** Top inset so the chat column clears the top HUD when the toggle is unusually low. */
const CHAT_COLUMN_MIN_TOP = 48;
/** Gap between exit button bottom and chat hide button top (base px, scaled). */
const CHAT_COLUMN_GAP_BELOW_EXIT = 8;
/** Square chat visibility control (base px, scaled). */
const CHAT_HIDE_BUTTON_BASE = 40;
/** Gap between hide button bottom and message column band (base px, scaled). */
const CHAT_COLUMN_GAP_BELOW_HIDE_BTN = 8;
/** Keep the chat stack above bottom HUD (loadout / orbs). Base px, scaled. */
const CHAT_BAND_BOTTOM_RESERVE = 110;
/** Fixed-height message list; content scrolls inside. */
const CHAT_MESSAGES_VIEWPORT_HEIGHT = 220;
/** Cap stored chat lines so memory stays bounded. */
const MAX_STORED_CHAT_MESSAGES = 400;
const CHAT_SCROLL_BOTTOM_EPS = 2;

interface ChatMessage {
  playerId: number;
  message: string;
  timestamp: number;
}

export class ChatWidget {
  /** Y-activated typing mode; movement suppression follows this. */
  private showChatInput: boolean = false;
  /** When false, messages + input are hidden; icon button remains. */
  private chatPanelVisible: boolean = true;
  /** Hit target for chat visibility toggle (screen px). */
  private chatHideButtonLayout: { x: number; y: number; w: number; h: number } = {
    x: CHAT_LEFT_MARGIN,
    y: CHAT_COLUMN_MIN_TOP,
    w: CHAT_HIDE_BUTTON_BASE,
    h: CHAT_HIDE_BUTTON_BASE,
  };
  /** Y below hide button where the chat column may begin (before MIN_TOP clamp). */
  private chatBandTopAnchorY: number = CHAT_COLUMN_MIN_TOP;
  /** Message column X; matches exit when anchored. */
  private chatColumnLeft: number = CHAT_LEFT_MARGIN;
  private chatInput: string = "";
  private chatMessages: ChatMessage[] = [];
  private messageHistory: string[] = [];
  private historyIndex: number = -1;
  private autocomplete: CommandAutocomplete;
  private readonly MAX_MESSAGE_LENGTH = 60;
  private readonly MAX_HISTORY_LENGTH = 50;
  /** Scroll offset inside the message viewport (px);0 = top of buffer. */
  private chatMessagesScrollTopPx = 0;
  /** When true, keep the newest messages in view (updates when new lines arrive). */
  private chatStickToBottom = true;
  /** Last frame's max scroll (content height − viewport height); used for wheel clamp between renders. */
  private lastChatMaxScrollPx = 0;

  constructor() {
    this.autocomplete = new CommandAutocomplete();
  }

  /**
   * Align chat column with exit; vertical band starts below exit (same X as before when a toggle sat there).
   */
  public setExitAnchoredChatColumn(
    exitLayout: { left: number; top: number; width: number; height: number },
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const gap = scaleHudValue(CHAT_COLUMN_GAP_BELOW_EXIT, canvasWidth, canvasHeight);
    const btnSize = scaleHudValue(CHAT_HIDE_BUTTON_BASE, canvasWidth, canvasHeight);
    const y = exitLayout.top + exitLayout.height + gap;
    this.chatHideButtonLayout = {
      x: exitLayout.left,
      y,
      w: btnSize,
      h: btnSize,
    };
    const gapBelowBtn = scaleHudValue(CHAT_COLUMN_GAP_BELOW_HIDE_BTN, canvasWidth, canvasHeight);
    this.chatBandTopAnchorY = y + btnSize + gapBelowBtn;
    this.chatColumnLeft = exitLayout.left;
  }

  /**
   * Chat icon control (under exit): returns true if the click was consumed.
   */
  public handleChatPanelVisibilityClick(x: number, y: number): boolean {
    const b = this.chatHideButtonLayout;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) {
      return false;
    }
    this.chatPanelVisible = !this.chatPanelVisible;
    if (!this.chatPanelVisible) {
      this.showChatInput = false;
      this.chatInput = "";
      this.autocomplete.reset();
      this.historyIndex = -1;
    } else {
      this.chatStickToBottom = true;
    }
    return true;
  }

  public isChatComposing(): boolean {
    return this.showChatInput;
  }

  /** Exit typing mode after a successful send. */
  public endChatComposition(): void {
    this.showChatInput = false;
    this.chatInput = "";
    this.autocomplete.reset();
    this.historyIndex = -1;
  }

  public toggleChatInput(): void {
    this.showChatInput = !this.showChatInput;
    if (!this.showChatInput) {
      this.chatInput = "";
      this.autocomplete.reset();
    } else {
      this.chatPanelVisible = true;
      this.historyIndex = -1;
    }
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

    if (this.chatMessages.length >= MAX_STORED_CHAT_MESSAGES) {
      this.chatMessages.shift();
    }

    this.chatMessages.push({
      playerId,
      message: truncatedMessage,
      timestamp: Date.now(),
    });
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    this.renderChatHideButton(ctx);
    if (!this.chatPanelVisible) {
      return;
    }
    this.renderChatMessages(ctx, gameState);
    this.renderChatInput(ctx);
    this.renderAutocompleteSuggestions(ctx);
  }

  private getPanelX(): number {
    return this.chatColumnLeft;
  }

  /**
   * Stacks message viewport (height `msgH`) + input (`CHAT_INPUT_HEIGHT`) with no gap.
   * Vertical position: center that combined block on the **canvas** at
   * `(canvasHeight - combinedH) / 2`, then clamp so the column stays at or below
   * `CHAT_COLUMN_MIN_TOP` / below the exit anchor and entirely above the bottom HUD reserve.
   * (Centering only inside the band skews upward because the band ends well above the canvas midpoint.)
   */
  private getChatColumnLayout(canvasWidth: number, canvasHeight: number): {
    panelTop: number;
    panelH: number;
    inputTopY: number;
  } {
    const bandTop = Math.max(CHAT_COLUMN_MIN_TOP, this.chatBandTopAnchorY);
    const bandBottom =
      canvasHeight - scaleHudValue(CHAT_BAND_BOTTOM_RESERVE, canvasWidth, canvasHeight);
    const bandH = Math.max(0, bandBottom - bandTop);

    const desiredMsgH = CHAT_MESSAGES_VIEWPORT_HEIGHT;
    let msgH = Math.min(desiredMsgH, Math.max(0, bandH - CHAT_INPUT_HEIGHT));
    msgH = Math.max(48, msgH);
    if (msgH + CHAT_INPUT_HEIGHT > bandH) {
      msgH = Math.max(0, bandH - CHAT_INPUT_HEIGHT);
    }
    const combinedH = msgH + CHAT_INPUT_HEIGHT;

    const minTop = bandTop;
    const maxTop = bandBottom - combinedH;
    const idealTop = (canvasHeight - combinedH) / 2;
    const panelTop =
      maxTop >= minTop ? Math.max(minTop, Math.min(maxTop, idealTop)) : minTop;
    const inputTopY = panelTop + msgH;
    return { panelTop, panelH: msgH, inputTopY };
  }

  /**
   * Screen rect for the scrollable message viewport.
   */
  public getMessagesPanelLayout(
    _canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number; w: number; h: number } | null {
    if (!this.chatPanelVisible) {
      return null;
    }
    const w = CHAT_PANEL_MAX_WIDTH;
    const x = this.getPanelX();
    const { panelTop, panelH } = this.getChatColumnLayout(_canvasWidth, canvasHeight);
    return { x, y: panelTop, w, h: panelH };
  }

  /**
   * Scroll the message list when the pointer is over the panel. Returns true if the event was consumed.
   */
  public handleWheel(
    x: number,
    y: number,
    deltaY: number,
    canvasWidth: number,
    canvasHeight: number
  ): boolean {
    const rect = this.getMessagesPanelLayout(canvasWidth, canvasHeight);
    if (!rect || x < rect.x || x > rect.x + rect.w || y < rect.y || y > rect.y + rect.h) {
      return false;
    }

    const prevTop = this.chatStickToBottom ? this.lastChatMaxScrollPx : this.chatMessagesScrollTopPx;
    this.chatStickToBottom = false;
    const maxScroll = Math.max(0, this.lastChatMaxScrollPx);
    this.chatMessagesScrollTopPx = Math.max(0, Math.min(maxScroll, prevTop + deltaY));
    if (this.chatMessagesScrollTopPx >= maxScroll - CHAT_SCROLL_BOTTOM_EPS) {
      this.chatStickToBottom = true;
    }
    return true;
  }

  private renderChatHideButton(ctx: CanvasRenderingContext2D): void {
    const { x, y, w, h } = this.chatHideButtonLayout;
    const { width: cw, height: ch } = ctx.canvas;
    drawHudFlatPanel(ctx, x, y, w, h, cw, ch);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const d = Math.min(w, h);
    ctx.save();
    if (!this.chatPanelVisible) {
      ctx.globalAlpha = 0.5;
    }
    this.drawChatBubbleIcon(ctx, cx, cy, d * 0.72);
    ctx.restore();
  }

  /** Simple speech-bubble glyph centered at (cx, cy); `d` is approximate outer diameter. */
  private drawChatBubbleIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, d: number): void {
    const bw = d * 0.52;
    const bh = d * 0.36;
    const bx = cx - bw / 2;
    const by = cy - bh / 2 - d * 0.06;
    const r = Math.max(2, d * 0.1);
    ctx.fillStyle = RPG_TITLE_CREAM;
    this.addRoundRectPath(ctx, bx, by, bw, bh, r, true, true);
    ctx.fill();
    const tx = bx + d * 0.1;
    const ty = by + bh - r * 0.4;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - d * 0.14, ty + d * 0.15);
    ctx.lineTo(tx + d * 0.08, ty + d * 0.06);
    ctx.closePath();
    ctx.fill();
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
    const messages = this.chatMessages;
    const padding = 10;
    const messageGap = 6;
    const width = CHAT_PANEL_MAX_WIDTH;
    const panelX = this.getPanelX();
    const textMaxWidth = width - padding * 2;
    const layout = this.getMessagesPanelLayout(ctx.canvas.width, ctx.canvas.height);
    if (!layout) {
      return;
    }
    const { y: blockTop, h: viewportH } = layout;

    type ProcessedRow =
      | { kind: "meta"; text: string; mono: boolean }
      | { kind: "body"; text: string; mono: boolean };

    const processedMessages: { rows: ProcessedRow[]; blockHeight: number }[] = messages.map(
      (chat) => {
        const isSystem = chat.playerId === 0;
        const rows: ProcessedRow[] = [];
        let blockHeight = 0;
        const rel = formatDistanceToNow(new Date(chat.timestamp), { addSuffix: true });

        if (isSystem) {
          ctx.font = `${CHAT_META_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`;
          const metaLines = this.wrapTextToWidth(ctx, rel, textMaxWidth);
          for (const line of metaLines) {
            rows.push({ kind: "meta", text: line, mono: true });
            blockHeight += CHAT_META_LINE_HEIGHT;
          }
          ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_MONOSPACE_FONT_FAMILY}`;
          const bodyLines = this.wrapTextToWidth(ctx, chat.message, textMaxWidth);
          for (const line of bodyLines) {
            rows.push({ kind: "body", text: line, mono: true });
            blockHeight += CHAT_BODY_LINE_HEIGHT;
          }
        } else {
          const entity = getEntityById(gameState, chat.playerId);
          const userName =
            entity instanceof PlayerClient ? entity.getDisplayName() : "Unknown";
          const metaText = `${userName} · ${rel}`;
          ctx.font = `${CHAT_META_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
          const headerLines = this.wrapTextToWidth(ctx, metaText, textMaxWidth);
          for (const line of headerLines) {
            rows.push({ kind: "meta", text: line, mono: false });
            blockHeight += CHAT_META_LINE_HEIGHT;
          }
          ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
          const bodyLines = this.wrapTextToWidth(ctx, chat.message, textMaxWidth);
          for (const line of bodyLines) {
            rows.push({ kind: "body", text: line, mono: false });
            blockHeight += CHAT_BODY_LINE_HEIGHT;
          }
        }
        return { rows, blockHeight: blockHeight + messageGap };
      },
    );

    const contentHeight =
      processedMessages.reduce((acc, m) => acc + m.blockHeight, 0) + padding * 2;
    const maxScroll = Math.max(0, contentHeight - viewportH);

    let scrollTop: number;
    if (this.chatStickToBottom) {
      scrollTop = maxScroll;
    } else {
      scrollTop = Math.max(0, Math.min(maxScroll, this.chatMessagesScrollTopPx));
    }
    if (scrollTop >= maxScroll - CHAT_SCROLL_BOTTOM_EPS) {
      this.chatStickToBottom = true;
      scrollTop = maxScroll;
    }
    this.chatMessagesScrollTopPx = scrollTop;
    this.lastChatMaxScrollPx = maxScroll;

    ctx.save();
    ctx.beginPath();
    ctx.rect(panelX, blockTop, width, viewportH);
    ctx.clip();

    let currentY = blockTop + padding - scrollTop;

    for (const msg of processedMessages) {
      for (const row of msg.rows) {
        if (row.kind === "meta") {
          ctx.font = `${CHAT_META_FONT_SIZE}px ${
            row.mono ? CHAT_MONOSPACE_FONT_FAMILY : CHAT_FONT_FAMILY
          }`;
          ctx.fillStyle = RPG_METADATA_MUTED;
          ctx.fillText(row.text, panelX + padding, currentY + CHAT_META_FONT_SIZE);
          currentY += CHAT_META_LINE_HEIGHT;
        } else {
          ctx.font = `${CHAT_FONT_SIZE}px ${
            row.mono ? CHAT_MONOSPACE_FONT_FAMILY : CHAT_FONT_FAMILY
          }`;
          ctx.fillStyle = CHAT_TEXT_COLOR;
          ctx.fillText(row.text, panelX + padding, currentY + CHAT_FONT_SIZE);
          currentY += CHAT_BODY_LINE_HEIGHT;
        }
      }
      currentY += messageGap;
    }

    ctx.restore();
  }

  private renderChatInput(ctx: CanvasRenderingContext2D): void {
    const width = CHAT_PANEL_MAX_WIDTH;
    const x = this.getPanelX();
    const y = this.getChatColumnLayout(ctx.canvas.width, ctx.canvas.height).inputTopY;

    ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
    const textY = y + CHAT_INPUT_HEIGHT / 2 + 5;
    const textX = x + 8;
    const textClipW = width - 16;

    ctx.save();
    ctx.beginPath();
    ctx.rect(textX, y + 4, textClipW, CHAT_INPUT_HEIGHT - 8);
    ctx.clip();

    if (!this.showChatInput) {
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText(CHAT_INPUT_PLACEHOLDER, textX, textY);
    } else if (!this.chatInput) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.fillText("Enter send · Esc cancel", textX, textY);
    } else {
      ctx.fillStyle = CHAT_TEXT_COLOR;
      const displayText = this.chatInput + "\u258C";
      const fullW = ctx.measureText(displayText).width;
      ctx.font = `11px ${CHAT_FONT_FAMILY}`;
      const counterLabel = `${this.chatInput.length}/${this.MAX_MESSAGE_LENGTH}`;
      const counterReserve = ctx.measureText(counterLabel).width + 10;
      ctx.font = `${CHAT_FONT_SIZE}px ${CHAT_FONT_FAMILY}`;
      const maxTextW = Math.max(0, textClipW - counterReserve);
      const scrollX = fullW <= maxTextW ? 0 : fullW - maxTextW;
      ctx.fillText(displayText, textX - scrollX, textY);
    }
    ctx.restore();

    if (this.showChatInput && this.chatInput) {
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

    const y = this.getChatColumnLayout(ctx.canvas.width, ctx.canvas.height).inputTopY - height - 4;

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
    ctx.fillText("↑↓ Shift+Tab · Esc close", x + padding, y + height - 6);
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
