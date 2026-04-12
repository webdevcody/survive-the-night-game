import type { WorldMapQuestDefinition } from "../map/quest-types";
import { getQuestCompletionType } from "../map/quest-types";
import type { QuestActiveProgress } from "./player-quest-state";

/** Human-readable description of the objective at `stepIndex` (0-based). */
export function formatQuestObjectiveAtStep(
  def: WorldMapQuestDefinition | undefined,
  stepIndex: number,
  progressForQuest: QuestActiveProgress | undefined,
): string {
  if (!def) {
    return "Check your quest journal (J) for the next objective.";
  }
  const total = def.steps.length;
  if (total === 0) {
    return getQuestCompletionType(def) === "final_step"
      ? "This quest completes as soon as it starts."
      : "Talk to a survivor to finish this quest.";
  }
  if (stepIndex >= total) {
    return getQuestCompletionType(def) === "final_step"
      ? "All objectives complete."
      : "All objectives done — talk to a survivor to turn in.";
  }
  const step = def.steps[stepIndex];
  if (!step) {
    return "Check your quest journal (J) for the next objective.";
  }
  switch (step.type) {
    case "pickup_item":
      return `Pick up ${step.itemType}.`;
    case "reach_waypoint":
      return `Go to tile ${step.row}, ${step.col}.`;
    case "kill_enemies": {
      const cur = progressForQuest?.kills?.[step.enemyType] ?? 0;
      return `Defeat ${step.count}× ${step.enemyType} (${cur}/${step.count}).`;
    }
    case "talk_to_npc": {
      if (step.npcName) {
        return `Talk to ${step.npcName}.`;
      }
      if (step.npcKey) {
        return `Talk to the survivor at ${step.npcKey}.`;
      }
      return "Talk to a survivor.";
    }
  }
}
