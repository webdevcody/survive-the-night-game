import type { GameState } from "@/state";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import { getQuestCompletionType } from "@shared/map/quest-types";
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
import { describeQuestStep, getQuestTurnInNpcLabel } from "./quest-display";

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
    gameState?: GameState | null,
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
        const completion = def ? getQuestCompletionType(def) : "dialogue_npc";
        const onObjective = stepTotal > 0 && stepIdx < stepTotal;
        ctx.fillStyle = RPG_BODY_TEXT;
        ctx.fillText(`${title}`, x + pad, ly);
        ly += bodySize * 1.15;
        ctx.fillStyle = RPG_METADATA_MUTED;
        if (onObjective) {
          ctx.fillText(`  Step ${stepIdx + 1}/${stepTotal}`, x + pad, ly);
          ly += bodySize * 1.1;
          const stepSummary = describeQuestStep(def?.steps[stepIdx], st.active[qid], gameState);
          ctx.fillText(`  ${stepSummary}`, x + pad, ly);
        } else {
          const turnInNpcLabel = getQuestTurnInNpcLabel(gameState, qid) ?? "an NPC";
          const status =
            stepTotal === 0
              ? completion === "final_step"
                ? "Completes when accepted"
                : `Talk to ${turnInNpcLabel} to finish`
              : stepIdx >= stepTotal
                ? completion === "final_step"
                  ? "All objectives complete"
                  : `Objectives done — talk to ${turnInNpcLabel} to turn in`
                : "—";
          ctx.fillText(`  ${status}`, x + pad, ly);
        }
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
