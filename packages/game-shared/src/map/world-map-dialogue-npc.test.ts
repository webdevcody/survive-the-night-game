import { describe, expect, it } from "vitest";
import {
  normalizeDialogueNpcs,
  pickDialogueNpcSession,
  getDialogueNpcSessions,
  dialogueNpcSessionsToSerialized,
  dialogueNpcSessionsFromSerialized,
} from "./world-map-types";
import type { PlayerQuestStatePayload } from "../quests/player-quest-state";

function st(partial: Partial<PlayerQuestStatePayload>): PlayerQuestStatePayload {
  return {
    active: partial.active ?? {},
    completed: partial.completed ?? [],
  };
}

describe("pickDialogueNpcSession", () => {
  it("picks first matching non-default condition", () => {
    const sessions = [
      { when: { type: "quest_completed" as const, questId: "a" }, lines: ["done a"] },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ completed: ["a"] })).lines[0]).toBe("done a");
    expect(pickDialogueNpcSession(sessions, st({ completed: [] })).lines[0]).toBe("fallback");
  });

  it("uses quest_active and quest_not_completed", () => {
    const sessions = [
      { when: { type: "quest_active" as const, questId: "q1" }, lines: ["active"] },
      { when: { type: "always" as const }, lines: ["default"] },
    ];
    expect(pickDialogueNpcSession(sessions, st({ active: { q1: 0 } })).lines[0]).toBe("active");
    expect(pickDialogueNpcSession(sessions, st({})).lines[0]).toBe("default");

    const s2 = [
      { when: { type: "quest_not_completed" as const, questId: "x" }, lines: ["not done"] },
      { when: { type: "always" as const }, lines: ["done branch"] },
    ];
    expect(pickDialogueNpcSession(s2, st({ completed: [] })).lines[0]).toBe("not done");
    expect(pickDialogueNpcSession(s2, st({ completed: ["x"] })).lines[0]).toBe("done branch");
  });

  it("quest_active_and_has_item requires active quest and hasItemType", () => {
    const sessions = [
      {
        when: {
          type: "quest_active_and_has_item" as const,
          questId: "q1",
          itemType: "key",
        },
        lines: ["has key"],
      },
      { when: { type: "always" as const }, lines: ["fallback"] },
    ];
    const stActive = st({ active: { q1: 0 } });
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

  it("round-trips quest_active_and_has_item via serialized sessions", () => {
    const sessions = [
      {
        when: {
          type: "quest_active_and_has_item" as const,
          questId: "q",
          itemType: "key",
        },
        lines: ["hi"],
      },
    ];
    const raw = dialogueNpcSessionsToSerialized(sessions);
    const back = dialogueNpcSessionsFromSerialized(raw);
    expect(back?.[0]?.when).toEqual({
      type: "quest_active_and_has_item",
      questId: "q",
      itemType: "key",
    });
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
              when: { type: "quest_completed", questId: "q" },
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
