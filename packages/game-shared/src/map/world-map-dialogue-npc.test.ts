import { describe, expect, it } from "vitest";
import {
  normalizeDialogueNpcs,
  pickDialogueNpcSession,
  getDialogueNpcSessions,
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
});
