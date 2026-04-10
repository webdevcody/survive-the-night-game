import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientInteractive, ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { Direction } from "@shared/util/direction";
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

export class DialogueSurvivorNpcClient extends ClientEntity implements Renderable {
  public dialogueLines: string[] = [];
  public displayName: string = "";

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.syncAuthoredFields(data);
  }

  private syncAuthoredFields(data: RawEntity): void {
    const raw = (data as any).dialogueLines;
    this.dialogueLines = Array.isArray(raw)
      ? raw.map((l: unknown) => (typeof l === "string" ? l : String(l)))
      : [];
    this.displayName = String((data as any).displayName ?? "").trim();
  }

  public getDialogueLines(): string[] {
    return this.dialogueLines.length > 0 ? this.dialogueLines : ["…"];
  }

  public deserializeFromBuffer(reader: BufferReader): void {
    super.deserializeFromBuffer(reader);
    this.syncAuthoredFields(this as unknown as RawEntity);
  }

  public getZIndex(): number {
    return Z_INDEX.ITEMS;
  }

  protected renderInteractionText(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    const myPlayer = getPlayer(gameState);
    const positionable = this.getExt(ClientPositionable);
    const interactive = this.getExt(ClientInteractive);

    if (!myPlayer || myPlayer.getId() === this.getId() || myPlayer.isZombiePlayer()) {
      return;
    }

    const lines = this.getDialogueLines();
    const onLast =
      gameState.openDialogueNpcId === this.getId() &&
      lines.length > 0 &&
      gameState.dialogueLineIndex >= lines.length - 1;
    const displayRaw =
      gameState.openDialogueNpcId === this.getId()
        ? onLast
          ? "close"
          : "next (Space)"
        : interactive.getDisplayName();
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

  /**
   * Drawn after darkness/zombie overlays (see renderer) so the bubble stays readable.
   */
  public renderSpeechBubble(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    if (gameState.openDialogueNpcId !== this.getId()) {
      return;
    }
    const lines = this.getDialogueLines();
    const idx = Math.max(0, Math.min(gameState.dialogueLineIndex, lines.length - 1));
    const msg = lines[idx]?.trim() || "…";
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
    const positionable = this.getExt(ClientPositionable);
    const pos = positionable.getPosition();
    const image = this.imageLoader.getWithDirection("survivor" as any, Direction.Down);
    ctx.drawImage(image, pos.x, pos.y);

    const name = this.displayName?.trim();
    if (name) {
      const cx = pos.x + positionable.getSize().x / 2;
      ctx.save();
      ctx.font = "7px Arial";
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.fillStyle = "#f3f3f3";
      const ny = pos.y - 4;
      ctx.strokeText(name, cx, ny);
      ctx.fillText(name, cx, ny);
      ctx.restore();
    }

    super.render(ctx, gameState);
  }
}

/** Renders the open dialogue bubble after darkness so it is not dimmed by the lighting overlay. */
export function renderOpenDialogueSpeechBubble(
  ctx: CanvasRenderingContext2D,
  gameState: GameState
): void {
  const id = gameState.openDialogueNpcId;
  if (id == null) return;
  const entity = getEntityById(gameState, id);
  if (entity instanceof DialogueSurvivorNpcClient) {
    entity.renderSpeechBubble(ctx, gameState);
  }
}
