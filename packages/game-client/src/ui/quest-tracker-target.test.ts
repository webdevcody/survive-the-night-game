import { describe, expect, it } from "vitest";
import {
  getQuestTrackerDistanceTiles,
  getQuestTrackerHeading,
  resolvePrimaryQuestTracker,
  type QuestTrackerNpcCandidate,
} from "./quest-tracker-target";

const activeProgress = (step: number) => ({
  active: { intro: { step } },
  completed: [],
});

describe("quest-tracker-target", () => {
  it("resolves waypoint targets from quest steps", () => {
    const quests = [
      {
        id: "intro",
        title: "Scout",
        steps: [{ type: "reach_waypoint", row: 10, col: 5 }],
        rewards: [],
        startRewards: [],
      },
    ];

    const resolution = resolvePrimaryQuestTracker(quests, activeProgress(0), 0, 0, []);
    expect(resolution?.target).toMatchObject({
      kind: "waypoint",
      label: "Waypoint",
      tileRow: 10,
      tileCol: 5,
    });
  });

  it("resolves talk-to-npc targets using nearest matching candidate", () => {
    const quests = [
      {
        id: "intro",
        title: "Scout",
        steps: [{ type: "talk_to_npc", npcName: "Mara", npcKey: "3,4" }],
        rewards: [],
        startRewards: [],
      },
    ];
    const candidates: QuestTrackerNpcCandidate[] = [
      { displayName: "Mara", npcKey: "3,4", worldX: 96, worldY: 96 },
      { displayName: "Mara", npcKey: "3,4", worldX: 900, worldY: 900 },
    ];

    const resolution = resolvePrimaryQuestTracker(quests, activeProgress(0), 100, 100, candidates);
    expect(resolution?.target).toMatchObject({
      kind: "talk_to_npc",
      label: "Mara",
      tileRow: 3,
      tileCol: 4,
      worldX: 96,
      worldY: 96,
    });
  });

  it("resolves turn-in target after objective steps are done", () => {
    const quests = [
      {
        id: "intro",
        title: "Scout",
        steps: [{ type: "pickup_item", itemType: "bandage" }],
        rewards: [],
        startRewards: [],
      },
    ];
    const progress = activeProgress(1);
    const candidates: QuestTrackerNpcCandidate[] = [
      {
        displayName: "Quartermaster",
        npcKey: "7,8",
        worldX: 160,
        worldY: 144,
        completesQuestId: "intro",
      },
    ];

    const resolution = resolvePrimaryQuestTracker(quests, progress, 0, 0, candidates);
    expect(resolution?.target).toMatchObject({
      kind: "turn_in",
      label: "Quartermaster",
      tileRow: 7,
      tileCol: 8,
    });
  });

  it("computes heading and tile distance", () => {
    expect(getQuestTrackerHeading(0, 0, 64, -64)).toMatchObject({
      cardinal: "NE",
      glyph: "↗",
    });
    expect(getQuestTrackerDistanceTiles(0, 0, 64, 0)).toBe(4);
  });
});
