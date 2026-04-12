import { DialogueSurvivorNpcClient } from "@/entities/environment/dialogue-survivor-npc";
import { MessageDecalClient } from "@/entities/environment/message-decal";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "@/state";
import { calculateHudScale } from "@/util/hud-scale";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
  RPG_COUNTER_GOLD,
  RPG_METADATA_MUTED,
  RPG_PROMPT_GOLD,
  RPG_PROMPT_TYPING,
  RPG_SLOT_FILL,
  RPG_SLOT_STROKE,
  RPG_TITLE_CREAM,
  strokeRpgPanelBorder,
} from "@/ui/rpg-hud-theme";
import { getConfig } from "@shared/config";
import { Direction } from "@shared/util/direction";

const TYPEWRITER_MS_PER_CHAR = 24;
const PANEL_OPEN_SPEED = 7;
const PANEL_CLOSE_SPEED = 10;

type DialogueButtonAction = "accept" | "decline";

type DialogueSnapshot = {
  entityId: number;
  lineIndex: number;
  totalLines: number;
  line: string;
  speaker: string;
  footer: string;
  showPortrait: boolean;
  hasQuestOfferChoice: boolean;
};

type DialogueButtonRect = {
  action: DialogueButtonAction;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      lines.push(line);
    }
    line = word;
  }

  if (line) {
    lines.push(line);
  }

  return lines.length > 0 ? lines : [""];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

export class DialoguePanel {
  private visibilityProgress = 0;
  private lastAnimationAt = 0;
  private activeLineKey: string | null = null;
  private revealStartedAt = 0;
  private revealInstantly = false;
  private lastSnapshot: DialogueSnapshot | null = null;
  private buttonRects: DialogueButtonRect[] = [];
  private mouseX = -Infinity;
  private mouseY = -Infinity;

  constructor(private assetManager: AssetManager) {}

  public getOcclusionProgress(): number {
    return this.visibilityProgress;
  }

  public isCurrentLineFullyRevealed(gameState: GameState): boolean {
    const now = performance.now();
    const snapshot = this.resolveSnapshot(gameState);
    this.syncSnapshot(snapshot, now);

    if (!snapshot) {
      return true;
    }

    return this.getVisibleCharacterCount(snapshot, now) >= snapshot.line.length;
  }

  public completeCurrentLine(gameState: GameState): boolean {
    const now = performance.now();
    const snapshot = this.resolveSnapshot(gameState);
    this.syncSnapshot(snapshot, now);

    if (!snapshot) {
      return false;
    }

    if (this.getVisibleCharacterCount(snapshot, now) >= snapshot.line.length) {
      return false;
    }

    this.revealInstantly = true;
    return true;
  }

  public updateMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  public handleClick(x: number, y: number, gameState: GameState): DialogueButtonAction | null {
    const now = performance.now();
    const snapshot = this.resolveSnapshot(gameState);
    this.syncSnapshot(snapshot, now);

    if (!snapshot) {
      return null;
    }

    const isFullyRevealed = this.getVisibleCharacterCount(snapshot, now) >= snapshot.line.length;
    if (!snapshot.hasQuestOfferChoice || !isFullyRevealed) {
      return null;
    }

    return this.getButtonActionAt(x, y);
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const now = performance.now();
    const snapshot = this.resolveSnapshot(gameState);
    this.syncSnapshot(snapshot, now);
    this.stepVisibility(snapshot !== null, now);

    const renderSnapshot = snapshot ?? this.lastSnapshot;
    if (!renderSnapshot || this.visibilityProgress <= 0.001) {
      this.buttonRects = [];
      if (!snapshot && this.visibilityProgress <= 0.001) {
        this.lastSnapshot = null;
      }
      return;
    }

    const { width, height } = ctx.canvas;
    const scale = calculateHudScale(width, height);
    const easedProgress = easeOutCubic(this.visibilityProgress);
    const sideMargin = Math.max(18, Math.round(26 * scale));
    const bottomMargin = Math.max(14, Math.round(18 * scale));
    const panelWidth = Math.min(width - sideMargin * 2, Math.round(1080 * scale));
    const panelHeight = Math.max(118, Math.round(170 * scale));
    const hiddenOffset = Math.round(170 * scale);
    const x = Math.round((width - panelWidth) / 2);
    const y =
      height - panelHeight - bottomMargin + Math.round((1 - easedProgress) * hiddenOffset);
    const innerPad = Math.max(12, Math.round(18 * scale));
    const accentHeight = Math.max(4, Math.round(5 * scale));
    const portraitBoxSize = renderSnapshot.showPortrait ? Math.max(72, Math.round(98 * scale)) : 0;
    const portraitGap = renderSnapshot.showPortrait ? Math.max(10, Math.round(14 * scale)) : 0;
    const headerHeight = Math.max(26, Math.round(30 * scale));
    const footerHeight = Math.max(22, Math.round(24 * scale));
    const panelBottomFadeHeight = panelHeight + Math.round(40 * scale);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const backgroundFade = ctx.createLinearGradient(0, height - panelBottomFadeHeight, 0, height);
    backgroundFade.addColorStop(0, "rgba(0, 0, 0, 0)");
    backgroundFade.addColorStop(1, `rgba(0, 0, 0, ${0.4 * easedProgress})`);
    ctx.fillStyle = backgroundFade;
    ctx.fillRect(0, height - panelBottomFadeHeight, width, panelBottomFadeHeight);

    fillRpgPanelGradient(ctx, x, y, panelWidth, panelHeight);
    strokeRpgPanelBorder(ctx, x, y, panelWidth, panelHeight, Math.max(2, Math.round(2 * scale)));
    drawRpgTopAccentBar(ctx, x, y, panelWidth, accentHeight);

    const contentTop = y + innerPad;
    const portraitX = x + innerPad;
    const portraitY = contentTop + headerHeight;
    const bodyX = portraitX + portraitBoxSize + portraitGap;
    const bodyWidth = panelWidth - (bodyX - x) - innerPad;
    const bodyTop = contentTop + headerHeight;
    const bodyBottom = y + panelHeight - innerPad - footerHeight;
    const lineCounter = `${renderSnapshot.lineIndex + 1}/${renderSnapshot.totalLines}`;
    const visibleChars = this.getVisibleCharacterCount(renderSnapshot, now);
    const isFullyRevealed = visibleChars >= renderSnapshot.line.length;
    const showingQuestOfferChoice = renderSnapshot.hasQuestOfferChoice && isFullyRevealed;
    const visibleText = isFullyRevealed
      ? renderSnapshot.line
      : `${renderSnapshot.line.slice(0, visibleChars)}|`;
    const interactionKey = String(getConfig().keybindings.INTERACT || "E").toUpperCase();
    const footerButtonTop = y + panelHeight - innerPad - Math.max(28, Math.round(32 * scale));
    const buttonRects = showingQuestOfferChoice
      ? this.createQuestOfferButtons(bodyX, x + panelWidth - innerPad, footerButtonTop, scale)
      : [];
    this.buttonRects = buttonRects;

    ctx.font = `bold ${Math.max(14, Math.round(18 * scale))}px Georgia`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.fillText(renderSnapshot.speaker, bodyX, contentTop);

    ctx.textAlign = "right";
    ctx.fillStyle = RPG_COUNTER_GOLD;
    ctx.font = `bold ${Math.max(11, Math.round(13 * scale))}px Arial`;
    ctx.fillText(lineCounter, x + panelWidth - innerPad, contentTop + Math.round(2 * scale));

    if (renderSnapshot.showPortrait) {
      ctx.fillStyle = RPG_SLOT_FILL;
      ctx.fillRect(portraitX, portraitY, portraitBoxSize, portraitBoxSize);
      ctx.strokeStyle = RPG_SLOT_STROKE;
      ctx.lineWidth = Math.max(2, Math.round(2 * scale));
      ctx.strokeRect(portraitX, portraitY, portraitBoxSize, portraitBoxSize);

      const portraitInnerPad = Math.max(8, Math.round(10 * scale));
      const portraitImage = this.assetManager.getWithDirection("survivor" as any, Direction.Down);
      ctx.drawImage(
        portraitImage,
        portraitX + portraitInnerPad,
        portraitY + portraitInnerPad,
        portraitBoxSize - portraitInnerPad * 2,
        portraitBoxSize - portraitInnerPad * 2,
      );

      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(
        portraitX,
        portraitY + portraitBoxSize - Math.max(18, Math.round(20 * scale)),
        portraitBoxSize,
        Math.max(18, Math.round(20 * scale)),
      );
      ctx.fillStyle = "rgba(255, 232, 178, 0.95)";
      ctx.font = `bold ${Math.max(10, Math.round(11 * scale))}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText("NPC", portraitX + portraitBoxSize / 2, portraitY + portraitBoxSize - 16 * scale);
      ctx.textAlign = "left";
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(bodyX, bodyTop, bodyWidth, Math.max(10, bodyBottom - bodyTop));
    ctx.clip();

    ctx.font = `${Math.max(13, Math.round(16 * scale))}px Arial`;
    ctx.fillStyle = RPG_BODY_TEXT;
    const wrappedLines = wrapText(ctx, visibleText, bodyWidth);
    const lineHeight = Math.max(18, Math.round(22 * scale));
    for (let index = 0; index < wrappedLines.length; index++) {
      const line = wrappedLines[index]!;
      const lineY = bodyTop + index * lineHeight;
      if (lineY + lineHeight > bodyBottom) {
        break;
      }
      ctx.fillText(line, bodyX, lineY);
    }
    ctx.restore();

    if (showingQuestOfferChoice && buttonRects.length > 0) {
      this.renderQuestOfferButtons(ctx, buttonRects, scale);
    } else {
      ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px Arial`;
      ctx.textAlign = "left";
      ctx.fillStyle = isFullyRevealed ? RPG_PROMPT_GOLD : RPG_PROMPT_TYPING;
      ctx.fillText(
        isFullyRevealed ? renderSnapshot.footer : `${interactionKey} to finish line`,
        bodyX,
        y + panelHeight - innerPad - footerHeight + Math.round(4 * scale),
      );

      ctx.textAlign = "right";
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText(
        isFullyRevealed ? "RPG dialogue" : "Typing...",
        x + panelWidth - innerPad,
        y + panelHeight - innerPad - footerHeight + Math.round(4 * scale),
      );
    }

    ctx.restore();
  }

  private resolveSnapshot(gameState: GameState): DialogueSnapshot | null {
    const id = gameState.openDialogueNpcId;
    if (id == null) {
      return null;
    }

    const entity = getEntityById(gameState, id);
    if (entity instanceof DialogueSurvivorNpcClient) {
      const totalLines = Math.max(1, entity.getTotalDialogueLineCount(gameState));
      const lineIndex = clamp(gameState.dialogueLineIndex, 0, totalLines - 1);
      const keyName = String(getConfig().keybindings.INTERACT || "E").toUpperCase();
      return {
        entityId: id,
        lineIndex,
        totalLines,
        line: entity.getDialogueLineAt(lineIndex, gameState),
        speaker: entity.displayName?.trim() || "Survivor",
        footer: lineIndex >= totalLines - 1 ? `${keyName} to close` : `${keyName} to continue`,
        showPortrait: true,
        hasQuestOfferChoice:
          lineIndex >= totalLines - 1 && entity.getPendingQuestOfferId(gameState) !== null,
      };
    }

    if (entity instanceof MessageDecalClient) {
      const totalLines = Math.max(1, entity.getLineCount());
      const lineIndex = clamp(gameState.dialogueLineIndex, 0, totalLines - 1);
      const keyName = String(getConfig().keybindings.INTERACT || "E").toUpperCase();
      return {
        entityId: id,
        lineIndex,
        totalLines,
        line: entity.getLineAt(lineIndex),
        speaker: "Notice",
        footer: lineIndex >= totalLines - 1 ? `${keyName} to close` : `${keyName} to continue`,
        showPortrait: false,
        hasQuestOfferChoice: false,
      };
    }

    return null;
  }

  private syncSnapshot(snapshot: DialogueSnapshot | null, now: number): void {
    const snapshotKey = snapshot ? `${snapshot.entityId}:${snapshot.lineIndex}:${snapshot.line}` : null;

    if (snapshotKey !== this.activeLineKey) {
      this.activeLineKey = snapshotKey;
      this.revealStartedAt = now;
      this.revealInstantly = false;
    }

    if (snapshot) {
      this.lastSnapshot = snapshot;
    }
  }

  private stepVisibility(isOpen: boolean, now: number): void {
    const dtSeconds =
      this.lastAnimationAt > 0 ? Math.min(0.05, (now - this.lastAnimationAt) / 1000) : 1 / 60;
    this.lastAnimationAt = now;

    const target = isOpen ? 1 : 0;
    const speed = isOpen ? PANEL_OPEN_SPEED : PANEL_CLOSE_SPEED;
    const step = dtSeconds * speed;

    if (this.visibilityProgress < target) {
      this.visibilityProgress = Math.min(target, this.visibilityProgress + step);
    } else if (this.visibilityProgress > target) {
      this.visibilityProgress = Math.max(target, this.visibilityProgress - step);
    }

    if (!isOpen && this.visibilityProgress <= 0.001) {
      this.lastSnapshot = null;
      this.activeLineKey = null;
      this.revealInstantly = false;
      this.buttonRects = [];
    }
  }

  private getVisibleCharacterCount(snapshot: DialogueSnapshot, now: number): number {
    if (!snapshot.line) {
      return 0;
    }

    if (this.revealInstantly) {
      return snapshot.line.length;
    }

    return clamp(
      Math.floor((now - this.revealStartedAt) / TYPEWRITER_MS_PER_CHAR),
      0,
      snapshot.line.length,
    );
  }

  private createQuestOfferButtons(
    left: number,
    right: number,
    top: number,
    scale: number,
  ): DialogueButtonRect[] {
    const gap = Math.max(10, Math.round(12 * scale));
    const height = Math.max(28, Math.round(32 * scale));
    const acceptWidth = Math.max(132, Math.round(168 * scale));
    const declineWidth = Math.max(122, Math.round(150 * scale));
    const declineX = right - declineWidth;
    const acceptX = declineX - gap - acceptWidth;

    if (acceptX < left) {
      return [];
    }

    return [
      {
        action: "accept",
        label: "Accept quest",
        x: acceptX,
        y: top,
        width: acceptWidth,
        height,
      },
      {
        action: "decline",
        label: "Not now",
        x: declineX,
        y: top,
        width: declineWidth,
        height,
      },
    ];
  }

  private renderQuestOfferButtons(
    ctx: CanvasRenderingContext2D,
    buttonRects: DialogueButtonRect[],
    scale: number,
  ): void {
    ctx.font = `bold ${Math.max(11, Math.round(13 * scale))}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (const button of buttonRects) {
      const hovered = this.isPointInRect(this.mouseX, this.mouseY, button);
      ctx.fillStyle =
        button.action === "accept"
          ? hovered
            ? "rgba(97, 174, 126, 0.98)"
            : "rgba(71, 136, 96, 0.96)"
          : hovered
            ? "rgba(108, 118, 140, 0.98)"
            : "rgba(67, 74, 92, 0.96)";
      ctx.fillRect(button.x, button.y, button.width, button.height);

      ctx.strokeStyle =
        button.action === "accept" ? "rgba(206, 255, 221, 0.95)" : "rgba(216, 223, 240, 0.92)";
      ctx.lineWidth = Math.max(2, Math.round(2 * scale));
      ctx.strokeRect(button.x, button.y, button.width, button.height);

      ctx.fillStyle = "#f7f8fc";
      ctx.fillText(
        button.label,
        button.x + button.width / 2,
        button.y + button.height / 2 + Math.round(scale * 0.5),
      );
    }
  }

  private getButtonActionAt(x: number, y: number): DialogueButtonAction | null {
    for (const button of this.buttonRects) {
      if (this.isPointInRect(x, y, button)) {
        return button.action;
      }
    }
    return null;
  }

  private isPointInRect(x: number, y: number, rect: DialogueButtonRect): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
}
