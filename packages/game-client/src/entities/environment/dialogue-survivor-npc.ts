import { RawEntity } from "@shared/types/entity";
import { AssetManager } from "@/managers/asset";
import { GameState, getEntityById } from "@/state";
import { ClientEntity } from "@/entities/client-entity";
import { Renderable } from "@/entities/util";
import { ClientInteractive, ClientPositionable } from "@/extensions";
import { Z_INDEX } from "@shared/map";
import { DIALOGUE_NPC_MAX_LINE_COUNT } from "@shared/map/spawn-palette";
import { Direction } from "@shared/util/direction";
import { getPlayer } from "@/util/get-player";
import { renderInteractionText } from "@/util/interaction-text";
import { formatDisplayName } from "@/util/format";
import { getConfig } from "@shared/config";
import { BufferReader } from "@shared/util/buffer-serialization";
import {
  dialogueNpcSessionsFromSerialized,
  pickDialogueNpcSession,
} from "@shared/map/world-map-types";
import type { WorldMapDialogueNpcSession } from "@shared/map/world-map-types";
import { emptyPlayerQuestState } from "@shared/quests/player-quest-state";

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
  /** Resolved branches from server; legacy entities use synthesized single session. */
  public dialogueSessions: WorldMapDialogueNpcSession[] = [];
  public displayName: string = "";

  constructor(data: RawEntity, assetManager: AssetManager) {
    super(data, assetManager);
    this.syncAuthoredFields(data);
  }

  private syncAuthoredFields(data: RawEntity): void {
    const rawSessions = (data as Record<string, unknown>).dialogueSessions;
    let sessions = dialogueNpcSessionsFromSerialized(rawSessions);
    if (!sessions || sessions.length === 0) {
      const raw = (data as Record<string, unknown>).dialogueLines;
      let lines = Array.isArray(raw)
        ? raw.map((l: unknown) => (typeof l === "string" ? l : String(l)))
        : [];
      const rawAfter = (data as Record<string, unknown>).dialogueLinesAfterQuestGrant;
      const after = Array.isArray(rawAfter)
        ? rawAfter.map((l: unknown) => (typeof l === "string" ? l : String(l)))
        : [];
      for (const x of after) {
        if (lines.length >= DIALOGUE_NPC_MAX_LINE_COUNT) break;
        lines.push(x);
      }
      const grantRaw = (data as Record<string, unknown>).grantQuestId;
      const grantQuestId =
        grantRaw === null || grantRaw === undefined
          ? undefined
          : String(grantRaw).trim() || undefined;
      sessions = [
        {
          when: { type: "always" },
          lines: lines.length > 0 ? lines : ["…"],
          ...(grantQuestId ? { grantQuestId } : {}),
        },
      ];
    }
    this.dialogueSessions = sessions;
    this.displayName = String((data as Record<string, unknown>).displayName ?? "").trim();
  }

  private pickSession(gameState: GameState): WorldMapDialogueNpcSession {
    const p = getPlayer(gameState);
    const st = p?.getQuestProgressPayload() ?? emptyPlayerQuestState();
    return pickDialogueNpcSession(this.dialogueSessions, st);
  }

  /** Lines for the active session. */
  public getDialogueLines(gameState: GameState): string[] {
    const lines = this.pickSession(gameState).lines;
    return lines.length > 0 ? lines : ["…"];
  }

  public getTotalDialogueLineCount(gameState: GameState): number {
    return this.getDialogueLines(gameState).length;
  }

  public getDialogueLineAt(globalIndex: number, gameState: GameState): string {
    const intro = this.getDialogueLines(gameState);
    return intro[globalIndex]?.trim() || "…";
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

    const total = this.getTotalDialogueLineCount(gameState);
    const onLast =
      gameState.openDialogueNpcId === this.getId() &&
      total > 0 &&
      gameState.dialogueLineIndex >= total - 1;
    const displayRaw =
      gameState.openDialogueNpcId === this.getId()
        ? onLast
          ? "close"
          : "next"
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
    const total = this.getTotalDialogueLineCount(gameState);
    const idx = Math.max(0, Math.min(gameState.dialogueLineIndex, Math.max(0, total - 1)));
    const msg = this.getDialogueLineAt(idx, gameState);
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
  gameState: GameState,
): void {
  const id = gameState.openDialogueNpcId;
  if (id == null) return;
  const entity = getEntityById(gameState, id);
  if (entity instanceof DialogueSurvivorNpcClient) {
    entity.renderSpeechBubble(ctx, gameState);
  }
}
