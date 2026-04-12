import type { QuestStep, WorldMapQuestDefinition } from "../map/quest-types";
import { getQuestCompletionType } from "../map/quest-types";
import type { PlayerQuestStatePayload } from "./player-quest-state";
import { getActiveStepIndex } from "./player-quest-state";

/** Resolved world position (and optional NPC) for map/HUD markers. */
export type QuestNavigationTarget = {
  worldX: number;
  worldY: number;
  /** Set when the objective is a specific dialogue NPC (talk step or turn-in). */
  npcEntityId?: number;
};

/** What the client should point at for the tracked (first) active quest. */
export type QuestNavNeed =
  | { type: "none" }
  | { type: "waypoint"; row: number; col: number }
  | { type: "talk_npc"; step: Extract<QuestStep, { type: "talk_to_npc" }> }
  | { type: "turn_in"; questId: string };

/** Same ordering as the active-quest HUD tracker: first key in `active`. */
export function getFirstActiveQuestId(st: PlayerQuestStatePayload): string | null {
  const ids = Object.keys(st.active);
  return ids.length > 0 ? ids[0]! : null;
}

export function getTrackedQuestNavigationNeed(
  st: PlayerQuestStatePayload,
  def: WorldMapQuestDefinition | undefined,
  questId: string,
): QuestNavNeed {
  if (!def || st.active[questId] === undefined) {
    return { type: "none" };
  }

  const stepIdx = getActiveStepIndex(st, questId);
  const n = def.steps.length;

  if (stepIdx >= n) {
    if (getQuestCompletionType(def) !== "dialogue_npc") {
      return { type: "none" };
    }
    return { type: "turn_in", questId };
  }

  const step = def.steps[stepIdx];
  if (!step) {
    return { type: "none" };
  }

  if (step.type === "reach_waypoint") {
    return { type: "waypoint", row: step.row, col: step.col };
  }
  if (step.type === "talk_to_npc") {
    return { type: "talk_npc", step };
  }

  return { type: "none" };
}
