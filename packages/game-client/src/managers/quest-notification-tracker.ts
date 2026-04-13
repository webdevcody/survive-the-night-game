import type { PlayerQuestStatePayload } from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";
import { formatQuestObjectiveAtStep } from "@shared/quests/quest-step-format";
import type { WorldMapQuestDefinition } from "@shared/map/quest-types";
import type { GameState } from "@/state";
import { QuestCompletedModal, formatQuestRewardsForDisplay } from "@/ui/quest-completed-modal";
import { getQuestObjectiveLine } from "@/ui/quest-display";
import type { PlayerClient } from "@/entities/player";

export interface QuestNotificationDeps {
  getMyPlayer: () => PlayerClient | null;
  getAuthoredQuests: () => WorldMapQuestDefinition[];
  addHudMessage: (message: string, color: string) => void;
  questCompletedModal: QuestCompletedModal;
}

export class QuestNotificationTracker {
  private questCompletionBaseline: Set<string> | null = null;
  private questActiveBaseline: Set<string> | null = null;
  private questProgressBaseline: PlayerQuestStatePayload | null = null;

  private deps: QuestNotificationDeps;

  constructor(deps: QuestNotificationDeps) {
    this.deps = deps;
  }

  public reset(): void {
    this.questCompletionBaseline = null;
    this.questActiveBaseline = null;
    this.questProgressBaseline = null;
    this.deps.questCompletedModal.clear();
  }

  public poll(gameState: GameState): void {
    const player = this.deps.getMyPlayer();
    if (!player) return;

    const st = player.getQuestProgressPayload();
    const completed = new Set(st.completed);
    const activeIds = Object.keys(st.active);

    if (
      this.questCompletionBaseline === null ||
      this.questActiveBaseline === null ||
      this.questProgressBaseline === null
    ) {
      this.questCompletionBaseline = new Set(completed);
      this.questActiveBaseline = new Set(activeIds);
      this.questProgressBaseline = this.cloneQuestPayload(st);
      return;
    }

    const prevCompleted = this.questCompletionBaseline;
    const prevActive = this.questActiveBaseline;
    const prevProgress = this.questProgressBaseline;
    const quests = this.deps.getAuthoredQuests();

    for (const qid of completed) {
      if (!prevCompleted.has(qid)) {
        const def = quests.find((q) => q.id === qid);
        this.deps.questCompletedModal.enqueue({
          title: def?.title ?? qid,
          questId: qid,
          rewardLines: formatQuestRewardsForDisplay(def?.rewards ?? []),
        });
      }
    }

    for (const qid of activeIds) {
      if (!prevActive.has(qid)) {
        const def = quests.find((q) => q.id === qid);
        const title = def?.title ?? qid;
        const objective = getQuestObjectiveLine(def, st, qid, gameState);
        this.deps.addHudMessage(`Quest started: ${title}`, "#d4b060");
        this.deps.addHudMessage(objective, "#9ad7ff");
      }
    }

    for (const qid of activeIds) {
      if (!prevProgress.active[qid]) continue;
      const prevIdx = getActiveStepIndex(prevProgress, qid);
      const curIdx = getActiveStepIndex(st, qid);
      if (curIdx <= prevIdx) continue;
      const def = quests.find((q) => q.id === qid);
      const title = def?.title ?? qid;
      const nextLine =
        def && curIdx >= def.steps.length
          ? getQuestObjectiveLine(def, st, qid, gameState)
          : formatQuestObjectiveAtStep(def, curIdx, st.active[qid]);
      this.deps.addHudMessage(`${title}: ${nextLine}`, "#c9e87a");
    }

    this.questCompletionBaseline = new Set(completed);
    this.questActiveBaseline = new Set(activeIds);
    this.questProgressBaseline = this.cloneQuestPayload(st);
  }

  private cloneQuestPayload(st: PlayerQuestStatePayload): PlayerQuestStatePayload {
    return {
      completed: [...st.completed],
      active: Object.fromEntries(
        Object.entries(st.active).map(([qid, e]) => [
          qid,
          e.kills && Object.keys(e.kills).length > 0
            ? { step: e.step, kills: { ...e.kills } }
            : { step: e.step },
        ]),
      ),
    };
  }
}
