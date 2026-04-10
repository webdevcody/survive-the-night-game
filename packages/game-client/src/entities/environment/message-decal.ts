import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientInteractive, ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { formatDisplayName } from "@/util/format";
import { getConfig } from "@shared/config";
import { BufferReader } from "@shared/util/buffer-serialization";

const BUBBLE_PAD = 6;
const BUBBLE_MAX_W = 200;
const BUBBLE_FONT = "7px Arial";
const LINE_HEIGHT = 9;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export class MessageDecalClient extends ClientEntity implements Renderable {
  public dialogueLines: string[] = [];

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.syncLines(data);
  }

  private syncLines(data: RawEntity): void {
    const raw = (data as { dialogueLines?: unknown }).dialogueLines;
    this.dialogueLines = Array.isArray(raw)
      ? raw.map((l: unknown) => (typeof l === "string" ? l : String(l)))
      : [];
  }

  public getMessageLines(): string[] {
    return this.dialogueLines.length > 0 ? this.dialogueLines : ["…"];
  }

  public getLineCount(): number {
    return this.getMessageLines().length;
  }

  public getLineAt(index: number): string {
    const lines = this.getMessageLines();
    return lines[Math.max(0, Math.min(index, lines.length - 1))]?.trim() || "…";
  }

  public deserializeFromBuffer(reader: BufferReader): void {
    super.deserializeFromBuffer(reader);
    this.syncLines(this as unknown as RawEntity);
  }

  public getZIndex(): number {
    return Z_INDEX.DECALS;
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (!myPlayer || myPlayer.getId() === this.getId() || myPlayer.isZombiePlayer()) {
      return;
    }

    const total = this.getLineCount();
    const onLast =
      gameState.openDialogueNpcId === this.getId() &&
      total > 0 &&
      gameState.dialogueLineIndex >= total - 1;
    const displayRaw =
      gameState.openDialogueNpcId === this.getId()
        ? onLast
          ? "close"
          : "next"
        : "interact";
    if (!displayRaw?.trim()) {
      return;
    }

    const text = `${formatDisplayName(displayRaw)} (${getConfig().keybindings.INTERACT})`;
    const isClosest = gameState.closestInteractiveEntityId === this.getId();

    renderInteractionText(
      ctx,
      text,
      positionable.getCenterPosition(),
      positionable.getPosition(),
      myPlayer.getCenterPosition(),
      interactive.getOffset(),
      isClosest,
    );
  }

  public renderSpeechBubble(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (gameState.openDialogueNpcId !== this.getId()) {
      return;
    }
    const total = this.getLineCount();
    const idx = Math.max(0, Math.min(gameState.dialogueLineIndex, Math.max(0, total - 1)));
    const msg = this.getLineAt(idx);
    const positionable = this.getExt(ClientPositionable);
    const pos = positionable.getPosition();
    const size = positionable.getSize();

    ctx.save();
    ctx.font = BUBBLE_FONT;
    const innerW = BUBBLE_MAX_W - BUBBLE_PAD * 2;
    const wrappedLines = wrapText(ctx, msg, innerW);
    let maxLineW = 0;
    for (const line of wrappedLines) {
      maxLineW = Math.max(maxLineW, ctx.measureText(line).width);
    }
    const textH = wrappedLines.length * LINE_HEIGHT;
    const bw = Math.min(BUBBLE_MAX_W, maxLineW + BUBBLE_PAD * 2);
    const bh = textH + BUBBLE_PAD * 2;
    const cx = pos.x + size.x / 2;
    const bx = cx - bw / 2;
    const by = pos.y - bh - 8;

    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = 1;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);

    ctx.fillStyle = "#111";
    wrappedLines.forEach((line, i) => {
      ctx.fillText(line, bx + BUBBLE_PAD, by + BUBBLE_PAD + (i + 1) * LINE_HEIGHT - 2);
    });
    ctx.restore();
  }

  public render(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    super.render(ctx, gameState);
  }
}

export function renderOpenMessageDecalSpeechBubble(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
): void {
  const id = gameState.openDialogueNpcId;
  if (id == null) return;
  const entity = getEntityById(gameState, id);
  if (entity instanceof MessageDecalClient) {
    entity.renderSpeechBubble(ctx, gameState);
  }
}
