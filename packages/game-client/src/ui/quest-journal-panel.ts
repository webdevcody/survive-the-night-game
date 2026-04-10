import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";
import { calculateHudScale, scaleHudValue } from "@/util/hud-scale";

export class QuestJournalPanel {
  private visible = false;

  public toggle(): void {
    this.visible = !this.visible;
  }

  public setVisible(v: boolean): void {
    this.visible = v;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public render(
    ctx: CanvasRenderingContext2D,
    quests: WorldMapQuestDefinition[],
    progress: PlayerQuestStatePayload | null,
  ): void {
    if (!this.visible) return;

    const { width: cw, height: ch } = ctx.canvas;
    const hudScale = calculateHudScale(cw, ch);
    const pad = scaleHudValue(14, cw, ch);
    const w = Math.min(360, Math.round(cw * 0.42));
    const h = Math.min(420, Math.round(ch * 0.55));
    const x = cw - w - pad;
    const y = pad;

    ctx.save();
    ctx.fillStyle = "rgba(12, 14, 20, 0.92)";
    ctx.strokeStyle = "rgba(200, 180, 120, 0.7)";
    ctx.lineWidth = Math.max(1, Math.round(2 * hudScale));
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    const titleSize = Math.max(12, Math.round(16 * hudScale));
    const bodySize = Math.max(10, Math.round(12 * hudScale));
    let ly = y + pad + titleSize;

    ctx.font = `bold ${titleSize}px Arial`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(250, 240, 210, 0.95)";
    ctx.fillText("Quests (J)", x + pad, ly);
    ly += pad * 1.2;

    if (!quests.length) {
      ctx.font = `${bodySize}px Arial`;
      ctx.fillStyle = "rgba(200, 200, 200, 0.85)";
      ctx.fillText("No authored quests on this map.", x + pad, ly);
      ctx.restore();
      return;
    }

    const st = progress ?? { active: {}, completed: [] };
    const byId = new Map(quests.map((q) => [q.id, q] as const));

    ctx.font = `${bodySize}px Arial`;

    const activeIds = Object.keys(st.active);
    ctx.fillStyle = "rgba(150, 220, 255, 0.95)";
    ctx.fillText("Active", x + pad, ly);
    ly += bodySize * 1.35;
    if (!activeIds.length) {
      ctx.fillStyle = "rgba(180, 180, 180, 0.8)";
      ctx.fillText("—", x + pad, ly);
      ly += bodySize * 1.5;
    } else {
      for (const qid of activeIds) {
        const def = byId.get(qid);
        const title = def?.title ?? qid;
        const stepIdx = getActiveStepIndex(st, qid);
        const stepTotal = def?.steps.length ?? 0;
        const curStep = stepIdx < stepTotal ? def?.steps[stepIdx] : undefined;
        const activeEntry = st.active[qid];
        const killExtra =
          curStep?.type === "kill_enemies"
            ? ` · ${activeEntry?.kills?.[curStep.enemyType] ?? 0}/${curStep.count} ${curStep.enemyType}`
            : "";
        ctx.fillStyle = "rgba(240, 248, 255, 0.92)";
        ctx.fillText(`${title}`, x + pad, ly);
        ly += bodySize * 1.15;
        ctx.fillStyle = "rgba(160, 170, 185, 0.9)";
        const stepLine =
          stepTotal === 0
            ? "  Objectives: talk to an NPC to finish"
            : stepIdx >= stepTotal
              ? "  Objectives done · talk to an NPC to turn in"
              : `  Step ${stepIdx + 1}/${stepTotal}${killExtra}`;
        ctx.fillText(stepLine, x + pad, ly);
        ly += bodySize * 1.35;
      }
    }

    ly += bodySize * 0.35;
    ctx.fillStyle = "rgba(190, 255, 180, 0.95)";
    ctx.fillText("Completed", x + pad, ly);
    ly += bodySize * 1.35;
    const done = st.completed.filter((id: string) => byId.has(id));
    if (!done.length) {
      ctx.fillStyle = "rgba(180, 180, 180, 0.8)";
      ctx.fillText("—", x + pad, ly);
    } else {
      for (const qid of done) {
        const def = byId.get(qid)!;
        ctx.fillStyle = "rgba(210, 230, 210, 0.9)";
        ctx.fillText(`✓ ${def.title}`, x + pad, ly);
        ly += bodySize * 1.25;
      }
    }

    ctx.restore();
  }
}
