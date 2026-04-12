import { describe, expect, it } from "vitest";
import {
  applyDialogueNpcEditorMetadataToRawDialogueNpcs,
  extractDialogueNpcEditorMetadataForQuestsJson,
  normalizeDialogueNpcs,
  parseDialogueNpcEditorMetadataFromQuestsSidecar,
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
  it("picks last matching non-default when several match", () => {
    const sessions = [
      { when: all([{ type: "quest_completed", questId: "a" }]), lines: ["done a first"] },
      { when: all([{ type: "quest_completed", questId: "a" }]), lines: ["done a last"] },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ completed: ["a"] })).lines[0]).toBe("done a last");
    expect(pickDialogueNpcSession(sessions, st({ completed: [] })).lines[0]).toBe("fallback");
  });

  it("picks last matching branch when broader and stricter both match", () => {
    const sessions = [
      { when: all([{ type: "quest_active", questId: "q1" }]), lines: ["broad"] },
      {
        when: all([
          { type: "quest_active", questId: "q1" },
          {
            type: "quest_active_and_has_item" as const,
            questId: "q1",
            itemType: "key",
          },
        ]),
        lines: ["narrow"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const stActive = st({ active: { q1: { step: 0 } } });
    expect(pickDialogueNpcSession(sessions, stActive, () => false).lines[0]).toBe("broad");
    expect(pickDialogueNpcSession(sessions, stActive, (t) => t === "key").lines[0]).toBe("narrow");
  });

  it("picks matching non-default when only one matches", () => {
    const sessions = [
      { when: all([{ type: "quest_completed", questId: "a" }]), lines: ["done a"] },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ completed: ["a"] })).lines[0]).toBe("done a");
    expect(pickDialogueNpcSession(sessions, st({ completed: [] })).lines[0]).toBe("fallback");
  });

  it("quest_not_active is false when quest is in active", () => {
    const sessions = [
      {
        when: all([{ type: "quest_not_active", questId: "q1" }]),
        lines: ["inactive"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ active: { q1: { step: 0 } } })).lines[0]).toBe(
      "fallback",
    );
    expect(pickDialogueNpcSession(sessions, st({})).lines[0]).toBe("inactive");
  });

  it("grant-style branch with quest_not_active does not match while that quest is active", () => {
    const sessions = [
      {
        when: all([
          { type: "quest_completed", questId: "a" },
          { type: "quest_not_completed", questId: "b" },
          { type: "quest_not_active", questId: "b" },
        ]),
        lines: ["grant pitch"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const midB = st({ completed: ["a"], active: { b: { step: 0 } } });
    expect(pickDialogueNpcSession(sessions, midB).lines[0]).toBe("fallback");
    const preB = st({ completed: ["a"] });
    expect(pickDialogueNpcSession(sessions, preB).lines[0]).toBe("grant pitch");
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

  it("preserves legacy editorGroup in fromSerialized but strips in toSerialized", () => {
    const raw = [
      {
        when: { type: "always" },
        lines: ["hi"],
        editorGroup: "Act 1",
      },
    ];
    const from = dialogueNpcSessionsFromSerialized(raw);
    expect(from?.[0]?.editorGroup).toBe("Act 1");
    const ser = dialogueNpcSessionsToSerialized(from ?? []);
    expect((ser[0] as Record<string, unknown>).editorGroup).toBeUndefined();
  });

  it("preserves editorGroupId in fromSerialized but strips in toSerialized", () => {
    const from = dialogueNpcSessionsFromSerialized([
      { when: { type: "always" }, lines: ["x"], editorGroupId: "my-g" },
    ]);
    expect(from?.[0]?.editorGroupId).toBe("my-g");
    const ser = dialogueNpcSessionsToSerialized(from ?? []);
    expect((ser[0] as Record<string, unknown>).editorGroupId).toBeUndefined();
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

  it("migrates legacy editorGroup only for contiguous runs; prunes singleton groups", () => {
    const [e] = normalizeDialogueNpcs(
      [
        {
          row: 0,
          col: 0,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["Hi"], editorGroup: "Intro" },
            {
              when: { type: "all", conditions: [{ type: "quest_completed", questId: "q" }] },
              lines: ["Bye"],
              editorGroup: "Outro",
            },
          ],
        },
      ],
      8,
    );
    expect(e?.dialogueSessions?.[0].editorGroup).toBeUndefined();
    expect(e?.dialogueSessions?.[1].editorGroup).toBeUndefined();
    expect(e?.dialogueSessions?.[0].editorGroupId).toBeUndefined();
    expect(e?.dialogueSessions?.[1].editorGroupId).toBeUndefined();
    expect(e?.editorGroups).toBeUndefined();
  });

  it("migrates contiguous legacy editorGroup rows into one editorGroupId", () => {
    const [e] = normalizeDialogueNpcs(
      [
        {
          row: 0,
          col: 0,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["A"], editorGroup: "Act 1" },
            {
              when: { type: "all", conditions: [{ type: "quest_completed", questId: "q" }] },
              lines: ["B"],
              editorGroup: "Act 1",
            },
          ],
        },
      ],
      8,
    );
    const id0 = e?.dialogueSessions?.[0].editorGroupId;
    const id1 = e?.dialogueSessions?.[1].editorGroupId;
    expect(id0).toBeTruthy();
    expect(id1).toBe(id0);
    expect(e?.editorGroups?.[id0!]).toBe("Act 1");
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

describe("dialogueNpcEditorMetadata (quests sidecar)", () => {
  it("preserves spaces in editor group labels (including trailing) through normalize", () => {
    const gid = "dg_spaced_label";
    const [normalized] = normalizeDialogueNpcs(
      [
        {
          row: 0,
          col: 0,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["a"], editorGroupId: gid },
            { when: { type: "always" }, lines: ["b"], editorGroupId: gid },
          ],
          editorGroups: { [gid]: "The Shop " },
        },
      ],
      8,
    );
    expect(normalized?.editorGroups?.[gid]).toBe("The Shop ");
  });

  it("extracts and parse round-trip restores editorGroupId after normalize", () => {
    const gid = "dg_testgroup_1";
    const [normalized] = normalizeDialogueNpcs(
      [
        {
          row: 1,
          col: 2,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["a"], editorGroupId: gid },
            {
              when: { type: "all", conditions: [{ type: "quest_completed", questId: "q" }] },
              lines: ["b"],
              editorGroupId: gid,
            },
          ],
          editorGroups: { [gid]: "My Group Label" },
        },
      ],
      8,
    );
    const meta = extractDialogueNpcEditorMetadataForQuestsJson(normalized ? [normalized] : []);
    expect(meta.length).toBe(1);
    expect(meta[0]!.sessionEditorGroupIds?.length).toBe(2);
    expect(meta[0]!.editorGroups?.[gid]).toBe("My Group Label");

    const rawNpcs = [
      {
        row: 1,
        col: 2,
        dialogueSessions: [
          { when: { type: "always" }, lines: ["a"] },
          {
            when: { type: "all", conditions: [{ type: "quest_completed", questId: "q" }] },
            lines: ["b"],
          },
        ],
      },
    ];
    const parsed = parseDialogueNpcEditorMetadataFromQuestsSidecar({
      quests: [],
      dialogueNpcEditorMetadata: meta,
    });
    const patched = applyDialogueNpcEditorMetadataToRawDialogueNpcs(rawNpcs, parsed);
    const [again] = normalizeDialogueNpcs(patched as Parameters<typeof normalizeDialogueNpcs>[0], 8);
    expect(again?.dialogueSessions?.[0]?.editorGroupId).toBe(gid);
    expect(again?.dialogueSessions?.[1]?.editorGroupId).toBe(gid);
    expect(again?.editorGroups?.[gid]).toBe("My Group Label");
    expect(meta[0]!.editorDialogueSessions?.length).toBe(2);
  });

  it("extracts metadata for multi-session NPCs without groups (session order) and restores from sidecar", () => {
    const [normalized] = normalizeDialogueNpcs(
      [
        {
          row: 3,
          col: 4,
          dialogueSessions: [
            { when: { type: "always" }, lines: ["third"] },
            {
              when: { type: "all", conditions: [{ type: "quest_completed", questId: "q1" }] },
              lines: ["first"],
            },
            {
              when: { type: "all", conditions: [{ type: "quest_active", questId: "q2" }] },
              lines: ["second"],
            },
          ],
        },
      ],
      16,
    );
    const meta = extractDialogueNpcEditorMetadataForQuestsJson(normalized ? [normalized] : []);
    expect(meta.length).toBe(1);
    expect(meta[0]!.editorDialogueSessions?.map((s) => (s.lines as string[])[0])).toEqual([
      "third",
      "first",
      "second",
    ]);

    const rawNpcsWrongOrder = [
      {
        row: 3,
        col: 4,
        dialogueSessions: [
          {
            when: { type: "all", conditions: [{ type: "quest_active", questId: "q2" }] },
            lines: ["second"],
          },
          { when: { type: "always" }, lines: ["third"] },
          {
            when: { type: "all", conditions: [{ type: "quest_completed", questId: "q1" }] },
            lines: ["first"],
          },
        ],
      },
    ];
    const parsed = parseDialogueNpcEditorMetadataFromQuestsSidecar({
      quests: [],
      dialogueNpcEditorMetadata: meta,
    });
    const patched = applyDialogueNpcEditorMetadataToRawDialogueNpcs(rawNpcsWrongOrder, parsed);
    const [again] = normalizeDialogueNpcs(patched as Parameters<typeof normalizeDialogueNpcs>[0], 16);
    expect(again?.dialogueSessions?.map((s) => s.lines[0])).toEqual(["third", "first", "second"]);
  });
});
