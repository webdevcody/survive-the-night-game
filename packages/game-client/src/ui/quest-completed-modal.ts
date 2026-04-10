import type { GameState } from "@/state";
import type { QuestReward } from "@shared/map/quest-types";

export type QuestCompletedPayload = {
  title: string;
  questId: string;
  rewardLines: string[];
};

export function formatQuestRewardsForDisplay(rewards: QuestReward[]): string[] {
  if (!rewards.length) {
    return ["(no rewards defined)"];
  }
  return rewards.map((r) => {
    if (r.type === "permanent_stat") {
      return `+${r.amount} ${r.stat}`;
    }
    if (r.type === "experience") {
      return `+${r.amount} XP`;
    }
    return `${r.count}× ${r.itemType}`;
  });
}

/**
 * Full-screen dimmed overlay announcing a completed quest and its rewards.
 * Dismiss with Space, Enter, or Escape (wired from InputManager).
 */
export class QuestCompletedModal {
  private queue: QuestCompletedPayload[] = [];
  private current: QuestCompletedPayload | null = null;

  enqueue(payload: QuestCompletedPayload): void {
    this.queue.push(payload);
    if (!this.current) {
      this.advance();
    }
  }

  dismissCurrent(): void {
    if (!this.current) return;
    this.current = null;
    this.advance();
  }

  private advance(): void {
    this.current = this.queue.shift() ?? null;
  }

  isOpen(): boolean {
    return this.current != null;
  }

  clear(): void {
    this.queue = [];
    this.current = null;
  }

  render(ctx: CanvasRenderingContext2D, _gameState: GameState): void {
    if (!this.current) return;

    const { width: cw, height: ch } = ctx.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, cw, ch);

    const pad = 28;
    const maxW = Math.min(420, cw - 40);
    ctx.font = "bold 22px Arial";
    const title = "Quest completed!";
    const subtitle = this.current.title;

    ctx.font = "16px Arial";
    let bodyLines = [`Rewards:`];
    bodyLines = bodyLines.concat(this.current.rewardLines.map((l) => `  • ${l}`));
    bodyLines.push("");
    bodyLines.push("Press Space, Enter, or Esc to continue");

    ctx.font = "bold 22px Arial";
    const titleW = ctx.measureText(title).width;
    ctx.font = "18px Arial";
    const subW = ctx.measureText(subtitle).width;
    ctx.font = "16px Arial";
    let bodyMax = 0;
    for (const line of bodyLines) {
      bodyMax = Math.max(bodyMax, ctx.measureText(line).width);
    }

    const panelW = Math.min(maxW, Math.max(titleW, subW, bodyMax) + pad * 2);
    let panelH = pad + 32 + 8 + 24 + 12 + bodyLines.length * 22 + pad;
    panelH = Math.min(panelH, ch - 40);

    const x = (cw - panelW) / 2;
    const y = (ch - panelH) / 2;

    ctx.fillStyle = "rgba(18, 22, 32, 0.97)";
    ctx.strokeStyle = "rgba(200, 180, 90, 0.9)";
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, panelW, panelH);
    ctx.strokeRect(x, y, panelW, panelH);

    let ty = y + pad + 24;
    ctx.font = "bold 22px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 220, 120, 0.98)";
    ctx.fillText(title, cw / 2, ty);
    ty += 32;

    ctx.font = "18px Arial";
    ctx.fillStyle = "rgba(240, 245, 255, 0.95)";
    ctx.fillText(subtitle, cw / 2, ty);
    ty += 36;

    ctx.font = "16px Arial";
    ctx.textAlign = "left";
    const textLeft = x + pad;
    for (const line of bodyLines) {
      ctx.fillStyle = line.includes("Press ") ? "rgba(160, 170, 190, 0.9)" : "rgba(220, 225, 235, 0.95)";
      ctx.fillText(line, textLeft, ty);
      ty += 22;
    }

    ctx.restore();
  }
}
