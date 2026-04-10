import { describe, expect, it } from "vitest";
import {
  normalizeDialogueNpcs,
  pickDialogueNpcSession,
  getDialogueNpcSessions,
  dialogueNpcSessionsToSerialized,
  dialogueNpcSessionsFromSerialized,
} from "./world-map-types";
import type { DialogueNpcAtomicCondition, DialogueNpcCondition } from "./world-map-types";
import type { PlayerQuestStatePayload } from "../quests/player-quest-state";
import type { WorldMapQuestDefinition } from "./quest-types";

function st(partial: Partial<PlayerQuestStatePayload>): PlayerQuestStatePayload {
  return {
    active: partial.active ?? {},
    completed: partial.completed ?? [],
  };
}

function all(conditions: DialogueNpcAtomicCondition[]): DialogueNpcCondition {
  return { type: "all", conditions };
}

describe("pickDialogueNpcSession", () => {
  it("picks first matching non-default condition", () => {
    const sessions = [
      { when: all([{ type: "quest_completed", questId: "a" }]), lines: ["done a"] },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ completed: ["a"] })).lines[0]).toBe("done a");
    expect(pickDialogueNpcSession(sessions, st({ completed: [] })).lines[0]).toBe("fallback");
  });

  it("uses quest_active and quest_not_completed inside all", () => {
    const sessions = [
      { when: all([{ type: "quest_active", questId: "q1" }]), lines: ["active"] },
      { when: { type: "always" as const }, lines: ["default"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ active: { q1: { step: 0 } } })).lines[0]).toBe(
      "active",
    );
    expect(pickDialogueNpcSession(sessions, st({})).lines[0]).toBe("default");

    const s2 = [
      { when: all([{ type: "quest_not_completed", questId: "x" }]), lines: ["not done"] },
      { when: { type: "always" as const }, lines: ["done branch"] },
    ];
    expect(pickDialogueNpcSession(s2, st({ completed: [] })).lines[0]).toBe("not done");
    expect(pickDialogueNpcSession(s2, st({ completed: ["x"] })).lines[0]).toBe("done branch");
  });

  it("quest_active_all_steps_done matches when step index reaches authored step count", () => {
    const sessions = [
      {
        when: all([{ type: "quest_active_all_steps_done", questId: "q1" }]),
        lines: ["ready to turn in"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const ctx = { getQuestStepCount: (id: string) => (id === "q1" ? 2 : undefined) };
    const stDone = st({ active: { q1: { step: 2 } } });
    expect(pickDialogueNpcSession(sessions, stDone, () => false, ctx).lines[0]).toBe("ready to turn in");
    const stMid = st({ active: { q1: { step: 1 } } });
    expect(pickDialogueNpcSession(sessions, stMid, () => false, ctx).lines[0]).toBe("fallback");
    expect(pickDialogueNpcSession(sessions, stDone, () => false).lines[0]).toBe("fallback");
  });

  it("quest_active_on_matching_talk_step matches on final talk_to_npc step for this NPC", () => {
    const sessions = [
      {
        when: all([{ type: "quest_active_on_matching_talk_step", questId: "q1" }]),
        lines: ["thanks"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const def: WorldMapQuestDefinition = {
      id: "q1",
      title: "T",
      steps: [
        { type: "kill_enemies", enemyType: "zombie" as any, count: 5 },
        { type: "talk_to_npc", npcName: "Rick", npcKey: "126,122" },
      ],
      rewards: [],
      startRewards: [],
    };
    const ctx = {
      getQuestDefinition: (id: string) => (id === "q1" ? def : undefined),
      dialogueNpc: { displayName: "Rick", npcKey: "126,122" },
    };
    const onTalk = st({ active: { q1: { step: 1 } } });
    expect(pickDialogueNpcSession(sessions, onTalk, () => false, ctx).lines[0]).toBe("thanks");
    const onKill = st({ active: { q1: { step: 0 } } });
    expect(pickDialogueNpcSession(sessions, onKill, () => false, ctx).lines[0]).toBe("fallback");
    const wrongNpc = { ...ctx, dialogueNpc: { displayName: "Grace", npcKey: "126,119" } };
    expect(pickDialogueNpcSession(sessions, onTalk, () => false, wrongNpc).lines[0]).toBe("fallback");
  });

  it("quest_active_final_talk_turn_in matches on final talk step and after all objectives cleared", () => {
    const sessions = [
      {
        when: all([{ type: "quest_active_final_talk_turn_in", questId: "q1" }]),
        lines: ["finale"],
        completeQuestId: "q1",
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const def: WorldMapQuestDefinition = {
      id: "q1",
      title: "T",
      steps: [
        { type: "kill_enemies", enemyType: "zombie" as any, count: 5 },
        { type: "talk_to_npc", npcName: "Rick", npcKey: "126,122" },
      ],
      rewards: [],
      startRewards: [],
    };
    const ctx = {
      getQuestDefinition: (id: string) => (id === "q1" ? def : undefined),
      dialogueNpc: { displayName: "Rick", npcKey: "126,122" },
    };
    const onFinalTalk = st({ active: { q1: { step: 1 } } });
    expect(pickDialogueNpcSession(sessions, onFinalTalk, () => false, ctx).lines[0]).toBe("finale");
    const allDonePendingComplete = st({ active: { q1: { step: 2 } } });
    expect(pickDialogueNpcSession(sessions, allDonePendingComplete, () => false, ctx).lines[0]).toBe(
      "finale",
    );
    const midQuest = st({ active: { q1: { step: 0 } } });
    expect(pickDialogueNpcSession(sessions, midQuest, () => false, ctx).lines[0]).toBe("fallback");
    const wrongNpc = { ...ctx, dialogueNpc: { displayName: "Grace", npcKey: "126,119" } };
    expect(pickDialogueNpcSession(sessions, onFinalTalk, () => false, wrongNpc).lines[0]).toBe(
      "fallback",
    );
  });

  it("quest_active_final_talk_turn_in does not match when last step is not talk_to_npc", () => {
    const sessions = [
      {
        when: all([{ type: "quest_active_final_talk_turn_in", questId: "q1" }]),
        lines: ["finale"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const def: WorldMapQuestDefinition = {
      id: "q1",
      title: "T",
      steps: [
        { type: "talk_to_npc", npcName: "Rick", npcKey: "126,122" },
        { type: "kill_enemies", enemyType: "zombie" as any, count: 1 },
      ],
      rewards: [],
      startRewards: [],
    };
    const ctx = {
      getQuestDefinition: (id: string) => (id === "q1" ? def : undefined),
      dialogueNpc: { displayName: "Rick", npcKey: "126,122" },
    };
    const onLastKill = st({ active: { q1: { step: 1 } } });
    expect(pickDialogueNpcSession(sessions, onLastKill, () => false, ctx).lines[0]).toBe("fallback");
  });

  it("quest_active_and_has_item requires active quest and hasItemType", () => {
    const sessions = [
      {
        when: all([
          {
            type: "quest_active_and_has_item" as const,
            questId: "q1",
            itemType: "key",
          },
        ]),
        lines: ["has key"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const stActive = st({ active: { q1: { step: 0 } } });
    expect(
      pickDialogueNpcSession(sessions, stActive, () => false).lines[0],
    ).toBe("fallback");
    expect(
      pickDialogueNpcSession(sessions, stActive, (t) => t === "key").lines[0],
    ).toBe("has key");
    expect(
      pickDialogueNpcSession(sessions, st({}), (t) => t === "key").lines[0],
    ).toBe("fallback");
  });

  it("all with multiple atomics requires every clause", () => {
    const sessions = [
      {
        when: all([
          { type: "quest_completed", questId: "a" },
          { type: "quest_active", questId: "b" },
        ]),
        lines: ["both"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(
      pickDialogueNpcSession(
        sessions,
        st({ completed: ["a"], active: { b: { step: 0 } } }),
      ).lines[0],
    ).toBe("both");
    expect(
      pickDialogueNpcSession(sessions, st({ completed: ["a"] })).lines[0],
    ).toBe("fallback");
    expect(
      pickDialogueNpcSession(sessions, st({ active: { b: { step: 0 } } })).lines[0],
    ).toBe("fallback");
  });

  it("round-trips quest_active_and_has_item via serialized sessions", () => {
    const sessions = [
      {
        when: all([
          {
            type: "quest_active_and_has_item" as const,
            questId: "q",
            itemType: "key",
          },
        ]),
        lines: ["hi"],
      },
    ];
    const raw = dialogueNpcSessionsToSerialized(sessions);
    const back = dialogueNpcSessionsFromSerialized(raw);
    expect(back?.[0]?.when).toEqual({
      type: "all",
      conditions: [{ type: "quest_active_and_has_item", questId: "q", itemType: "key" }],
    });
  });

  it("does not accept legacy flat when (greenfield JSON shape)", () => {
    const back = dialogueNpcSessionsFromSerialized([
      {
        when: { type: "quest_completed", questId: "q" },
        lines: ["legacy"],
      },
    ]);
    expect(back?.[0]?.when).toBeUndefined();
  });
});

describe("normalizeDialogueNpcs dialogueSessions", () => {
  it("migrates legacy flat fields to one always session", () => {
    const [e] = normalizeDialogueNpcs(
      [{ row: 0, col: 0, lines: ["hi"], grantQuestId: "g1" }],
      8,
    );
    expect(e?.dialogueSessions?.length).toBe(1);
    expect(e?.dialogueSessions?.[0].when?.type).toBe("always");
    expect(e?.dialogueSessions?.[0].lines).toEqual(["hi"]);
    expect(e?.dialogueSessions?.[0].grantQuestId).toBe("g1");
  });

  it("folds legacy linesAfterQuestGrant into lines", () => {
    const [e] = normalizeDialogueNpcs(
      [{ row: 0, col: 0, lines: ["a"], grantQuestId: "g", linesAfterQuestGrant: ["b"] } as any],
      8,
    );
    expect(e?.dialogueSessions?.[0].lines).toEqual(["a", "b"]);
    expect("linesAfterQuestGrant" in (e?.dialogueSessions?.[0] ?? {})).toBe(false);
  });

  it("preserves multiple sessions from JSON", () => {
    const [e] = normalizeDialogueNpcs(
      [
        {
          row: 1,
          col: 1,
          dialogueSessions: [
            {
              when: { type: "all", conditions: [{ type: "quest_completed", questId: "q" }] },
              lines: ["thanks"],
              completeQuestId: "q",
            },
            { when: { type: "always" }, lines: ["hello"] },
          ],
        },
      ],
      8,
    );
    const sessions = getDialogueNpcSessions(e!);
    expect(sessions.length).toBe(2);
    expect(pickDialogueNpcSession(sessions, st({ completed: ["q"] })).lines[0]).toBe("thanks");
    expect(pickDialogueNpcSession(sessions, st({})).lines[0]).toBe("hello");
  });

  it("preserves healOnDialogueComplete through normalizeDialogueNpcs", () => {
    const [e] = normalizeDialogueNpcs(
      [
        {
          row: 0,
          col: 0,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["Rest."], healOnDialogueComplete: true },
          ],
        },
      ],
      8,
    );
    expect(e?.dialogueSessions?.[0].healOnDialogueComplete).toBe(true);
  });

  it("round-trips healOnDialogueComplete via serialized sessions", () => {
    const sessions = [
      { when: { type: "always" as const }, lines: ["Hi"], healOnDialogueComplete: true as const },
    ];
    const raw = dialogueNpcSessionsToSerialized(sessions);
    const back = dialogueNpcSessionsFromSerialized(raw);
    expect(back?.[0]?.healOnDialogueComplete).toBe(true);
  });
});
