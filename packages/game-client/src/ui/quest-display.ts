import type { QuestStep, WorldMapQuestDefinition } from "@shared/map/quest-types";
import type {
  PlayerQuestStatePayload,
  QuestActiveProgress,
} from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";

export function describeQuestStep(
  step: QuestStep | undefined,
  activeEntry?: QuestActiveProgress,
): string {
  if (!step) return "(unknown step)";
  if (step.type === "pickup_item") return `Pick up ${step.itemType}`;
  if (step.type === "reach_waypoint") {
    const radius = step.radiusTiles ?? 2;
    return `Reach (${step.row}, ${step.col}) · r≤${radius}`;
  }
  if (step.type === "kill_enemies") {
    const current = activeEntry?.kills?.[step.enemyType] ?? 0;
    return `Kill ${current}/${step.count} ${step.enemyType}`;
  }
  if (step.type === "talk_to_npc") {
    if (step.npcName && step.npcKey) return `Talk to ${step.npcName} (${step.npcKey})`;
    if (step.npcName) return `Talk to ${step.npcName}`;
    if (step.npcKey) return `Talk to NPC at ${step.npcKey}`;
    return "Talk to NPC";
  }
  return "(unknown step)";
}

export function getQuestObjectiveLine(
  def: WorldMapQuestDefinition | undefined,
  progress: PlayerQuestStatePayload,
  questId: string,
): string {
  const stepIdx = getActiveStepIndex(progress, questId);
  const stepTotal = def?.steps.length ?? 0;
  if (stepTotal === 0) {
    return "Objectives: talk to an NPC to finish";
  }
  if (stepIdx >= stepTotal) {
    return "Objectives done · talk to an NPC to turn in";
  }
  const stepSummary = describeQuestStep(def?.steps[stepIdx], progress.active[questId]);
  return `Step ${stepIdx + 1}/${Math.max(1, stepTotal)}${stepSummary ? ` · ${stepSummary}` : ""}`;
}
