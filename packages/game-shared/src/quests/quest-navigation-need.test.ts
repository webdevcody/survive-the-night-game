import { describe, expect, it } from "vitest";
import type { WorldMapQuestDefinition } from "../map/quest-types";
import type { PlayerQuestStatePayload } from "./player-quest-state";
import { getTrackedQuestNavigationNeed } from "./quest-navigation-need";

function def(partial: Partial<WorldMapQuestDefinition>): WorldMapQuestDefinition {
  return {
    id: "q1",
    title: "T",
    steps: [],
    rewards: [],
    startRewards: [],
    ...partial,
  };
}

describe("getTrackedQuestNavigationNeed", () => {
  it("returns waypoint for reach_waypoint step", () => {
    const d = def({
      steps: [{ type: "reach_waypoint", row: 3, col: 10 }],
    });
    const st: PlayerQuestStatePayload = { active: { q1: { step: 0 } }, completed: [] };
    expect(getTrackedQuestNavigationNeed(st, d, "q1")).toEqual({
      type: "waypoint",
      row: 3,
      col: 10,
    });
  });

  it("returns talk_npc for talk_to_npc step", () => {
    const d = def({
      steps: [{ type: "talk_to_npc", npcName: "Sam", npcKey: "5,12" }],
    });
    const st: PlayerQuestStatePayload = { active: { q1: { step: 0 } }, completed: [] };
    expect(getTrackedQuestNavigationNeed(st, d, "q1")).toEqual({
      type: "talk_npc",
      step: { type: "talk_to_npc", npcName: "Sam", npcKey: "5,12" },
    });
  });

  it("returns turn_in when objectives done and completion is dialogue_npc", () => {
    const d = def({
      steps: [{ type: "reach_waypoint", row: 1, col: 1 }],
      completionType: "dialogue_npc",
    });
    const st: PlayerQuestStatePayload = { active: { q1: { step: 1 } }, completed: [] };
    expect(getTrackedQuestNavigationNeed(st, d, "q1")).toEqual({
      type: "turn_in",
      questId: "q1",
    });
  });

  it("returns none when final_step and all objectives done", () => {
    const d = def({
      steps: [{ type: "reach_waypoint", row: 1, col: 1 }],
      completionType: "final_step",
    });
    const st: PlayerQuestStatePayload = { active: { q1: { step: 1 } }, completed: [] };
    expect(getTrackedQuestNavigationNeed(st, d, "q1")).toEqual({ type: "none" });
  });

  it("returns none for kill / pickup steps", () => {
    const d = def({
      steps: [{ type: "kill_enemies", enemyType: "zombie", count: 3 }],
    });
    const st: PlayerQuestStatePayload = { active: { q1: { step: 0 } }, completed: [] };
    expect(getTrackedQuestNavigationNeed(st, d, "q1")).toEqual({ type: "none" });
  });
});
