import { describe, expect, it } from "vitest";
import type { WorldMapQuestDefinition } from "../map/quest-types";
import type { EntityType } from "../types/entity";
import {
  coercePlayerQuestState,
  emptyPlayerQuestState,
  getActiveStepIndex,
  normalizeActiveEntry,
  parsePlayerQuestState,
  sanitizeActiveProgressAgainstQuestDefinition,
  stringifyPlayerQuestState,
} from "./player-quest-state";

describe("player-quest-state", () => {
  it("normalizes legacy numeric active entries from JSON string", () => {
    const raw = JSON.stringify({ active: { q1: 2, q2: 0 }, completed: ["done"] });
    const st = parsePlayerQuestState(raw);
    expect(st.active.q1).toEqual({ step: 2 });
    expect(st.active.q2).toEqual({ step: 0 });
    expect(st.completed).toEqual(["done"]);
    expect(getActiveStepIndex(st, "q1")).toBe(2);
  });

  it("coerces jsonb object with nested kills", () => {
    const st = coercePlayerQuestState({
      active: { killQuest: { step: 0, kills: { zombie: 3, fast_zombie: 1 } } },
      completed: [],
    });
    expect(st.active.killQuest).toEqual({
      step: 0,
      kills: { zombie: 3, fast_zombie: 1 },
    });
  });

  it("stringify omits empty kills and round-trips", () => {
    const a = emptyPlayerQuestState();
    a.active.x = { step: 1 };
    a.active.y = { step: 0, kills: { zombie: 2 } };
    const json = stringifyPlayerQuestState(a);
    const back = parsePlayerQuestState(json);
    expect(back.active.x).toEqual({ step: 1 });
    expect(back.active.y).toEqual({ step: 0, kills: { zombie: 2 } });
  });

  it("normalizeActiveEntry rejects invalid values", () => {
    expect(normalizeActiveEntry(-1)).toBeNull();
    expect(normalizeActiveEntry("x")).toBeNull();
    expect(normalizeActiveEntry({})).toBeNull();
  });

  const miniQuest = (steps: WorldMapQuestDefinition["steps"]): WorldMapQuestDefinition => ({
    id: "q",
    title: "t",
    steps,
    rewards: [],
    startRewards: [],
  });

  it("sanitize clamps step past end to steps.length", () => {
    const def = miniQuest([
      { type: "reach_waypoint", row: 0, col: 0 },
      { type: "reach_waypoint", row: 1, col: 1 },
    ]);
    expect(sanitizeActiveProgressAgainstQuestDefinition({ step: 99 }, def)).toEqual({ step: 2 });
  });

  it("sanitize caps kill tallies when count is reduced", () => {
    const def = miniQuest([{ type: "kill_enemies", enemyType: "zombie" as EntityType, count: 3 }]);
    expect(
      sanitizeActiveProgressAgainstQuestDefinition({ step: 0, kills: { zombie: 9 } }, def),
    ).toEqual({ step: 0, kills: { zombie: 2 } });
  });

  it("sanitize strips kills when current step is no longer kill_enemies", () => {
    const def = miniQuest([{ type: "reach_waypoint", row: 0, col: 0 }]);
    expect(
      sanitizeActiveProgressAgainstQuestDefinition({ step: 0, kills: { zombie: 2 } }, def),
    ).toEqual({ step: 0 });
  });

  it("sanitize keeps only the current kill step enemy key", () => {
    const def = miniQuest([{ type: "kill_enemies", enemyType: "zombie" as EntityType, count: 5 }]);
    expect(
      sanitizeActiveProgressAgainstQuestDefinition(
        { step: 0, kills: { zombie: 1, fast_zombie: 9 } },
        def,
      ),
    ).toEqual({ step: 0, kills: { zombie: 1 } });
  });
});
