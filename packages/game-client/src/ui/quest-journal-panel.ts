import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";
import { calculateHudScale, scaleHudValue } from "@/util/hud-scale";
import {
  drawRpgTopAccentBar,
  fillRpgPanelGradient,
  RPG_BODY_TEXT,
  RPG_COUNTER_GOLD,
  RPG_METADATA_MUTED,
  RPG_TITLE_CREAM,
  strokeRpgPanelBorder,
} from "@/ui/rpg-hud-theme";

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
    fillRpgPanelGradient(ctx, x, y, w, h);
    drawRpgTopAccentBar(ctx, x, y, w, Math.max(3, Math.round(4 * hudScale)));
    strokeRpgPanelBorder(ctx, x, y, w, h, Math.max(2, Math.round(2 * hudScale)));

    const titleSize = Math.max(12, Math.round(16 * hudScale));
    const bodySize = Math.max(10, Math.round(12 * hudScale));
    let ly = y + pad + titleSize;

    ctx.font = `bold ${titleSize}px Georgia`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = RPG_TITLE_CREAM;
    ctx.fillText("Quests (J)", x + pad, ly);
    ly += pad * 1.2;

    if (!quests.length) {
      ctx.font = `${bodySize}px Arial`;
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText("No authored quests on this map.", x + pad, ly);
      ctx.restore();
      return;
    }

    const st = progress ?? { active: {}, completed: [] };
    const byId = new Map(quests.map((q) => [q.id, q] as const));

    ctx.font = `${bodySize}px Arial`;

    const activeIds = Object.keys(st.active);
    ctx.fillStyle = RPG_COUNTER_GOLD;
    ctx.fillText("Active", x + pad, ly);
    ly += bodySize * 1.35;
    if (!activeIds.length) {
      ctx.fillStyle = RPG_METADATA_MUTED;
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
        ctx.fillStyle = RPG_BODY_TEXT;
        ctx.fillText(`${title}`, x + pad, ly);
        ly += bodySize * 1.15;
        ctx.fillStyle = RPG_METADATA_MUTED;
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
    ctx.fillStyle = "rgba(185, 220, 175, 0.95)";
    ctx.fillText("Completed", x + pad, ly);
    ly += bodySize * 1.35;
    const done = st.completed.filter((id: string) => byId.has(id));
    if (!done.length) {
      ctx.fillStyle = RPG_METADATA_MUTED;
      ctx.fillText("—", x + pad, ly);
    } else {
      for (const qid of done) {
        const def = byId.get(qid)!;
        ctx.fillStyle = "rgba(195, 220, 200, 0.92)";
        ctx.fillText(`✓ ${def.title}`, x + pad, ly);
        ly += bodySize * 1.25;
      }
    }

    ctx.restore();
  }
}
