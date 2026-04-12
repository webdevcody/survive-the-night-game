import type { GameState } from "@/state";
import {
  findDialogueNpcForQuestTurnIn,
  findDialogueNpcForTalkStep,
  getDialogueNpcObjectiveLabel,
} from "@/util/resolve-quest-navigation-target";
import type { QuestStep, WorldMapQuestDefinition } from "@shared/map/quest-types";
import { getQuestCompletionType } from "@shared/map/quest-types";
import type {
  PlayerQuestStatePayload,
  QuestActiveProgress,
} from "@shared/quests/player-quest-state";
import { getActiveStepIndex } from "@shared/quests/player-quest-state";

function getTalkNpcLabel(
  step: Extract<QuestStep, { type: "talk_to_npc" }>,
  gameState?: GameState | null,
): string {
  const npc = gameState ? findDialogueNpcForTalkStep(gameState, step) : null;
  if (npc) {
    return getDialogueNpcObjectiveLabel(npc);
  }
  if (step.npcName?.trim()) {
    return step.npcName.trim();
  }
  if (step.npcKey?.trim()) {
    return `the survivor at ${step.npcKey.trim()}`;
  }
  return "an NPC";
}

export function getQuestTurnInNpcLabel(
  gameState: GameState | null | undefined,
  questId: string,
): string | null {
  if (!gameState) {
    return null;
  }
  const npc = findDialogueNpcForQuestTurnIn(gameState, questId);
  return npc ? getDialogueNpcObjectiveLabel(npc) : null;
}

export function describeQuestStep(
  step: QuestStep | undefined,
  activeEntry?: QuestActiveProgress,
  gameState?: GameState | null,
): string {
  if (!step) return "(unknown step)";
  if (step.type === "pickup_item") return `Pick up ${step.itemType}`;
  if (step.type === "reach_waypoint") {
    return `Go to tile ${step.row}, ${step.col}`;
  }
  if (step.type === "kill_enemies") {
    const current = activeEntry?.kills?.[step.enemyType] ?? 0;
    return `Kill ${current}/${step.count} ${step.enemyType}`;
  }
  if (step.type === "talk_to_npc") {
    return `Talk to ${getTalkNpcLabel(step, gameState)}`;
  }
  return "(unknown step)";
}

export function getQuestObjectiveLine(
  def: WorldMapQuestDefinition | undefined,
  progress: PlayerQuestStatePayload,
  questId: string,
  gameState?: GameState | null,
): string {
  const stepIdx = getActiveStepIndex(progress, questId);
  const stepTotal = def?.steps.length ?? 0;
  const completion = def ? getQuestCompletionType(def) : "dialogue_npc";
  if (stepTotal === 0) {
    const label = getQuestTurnInNpcLabel(gameState, questId) ?? "an NPC";
    return completion === "final_step"
      ? "Objectives: completes when accepted"
      : `Objectives: talk to ${label} to finish`;
  }
  if (stepIdx >= stepTotal) {
    const label = getQuestTurnInNpcLabel(gameState, questId) ?? "an NPC";
    return completion === "final_step"
      ? "All objectives complete"
      : `Objectives done · talk to ${label} to turn in`;
  }
  const stepSummary = describeQuestStep(def?.steps[stepIdx], progress.active[questId], gameState);
  return `Step ${stepIdx + 1}/${Math.max(1, stepTotal)}${stepSummary ? ` · ${stepSummary}` : ""}`;
}
