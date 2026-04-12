import { describe, expect, it } from "vitest";
import { createQuestDefinitionDraft, normalizeQuests } from "./quest-types";

describe("createQuestDefinitionDraft", () => {
  it("creates a valid starter quest with a default objective", () => {
    expect(createQuestDefinitionDraft("quest_intro", "Scout the path")).toEqual({
      id: "quest_intro",
      title: "Scout the path",
      steps: [{ type: "pickup_item", itemType: "bandage" }],
      completionType: "dialogue_npc",
      rewards: [],
      startRewards: [],
    });
  });

  it("normalizes blank ids and titles", () => {
    const draft = createQuestDefinitionDraft("   ", "   ");
    expect(draft.id).toBe("quest");
    expect(draft.title).toBe("New quest");
    expect(draft.steps).toHaveLength(1);
  });
});

describe("normalizeQuests completionType", () => {
  it("preserves final_step and dialogue_npc", () => {
    const n = 256;
    const out = normalizeQuests(
      [
        { id: "a", title: "A", steps: [], completionType: "final_step", rewards: [], startRewards: [] },
        { id: "b", title: "B", steps: [], completionType: "dialogue_npc", rewards: [], startRewards: [] },
      ],
      n,
    );
    expect(out[0]?.completionType).toBe("final_step");
    expect(out[1]?.completionType).toBe("dialogue_npc");
  });

  it("omits completionType for legacy quests", () => {
    const n = 256;
    const out = normalizeQuests([{ id: "c", title: "C", steps: [], rewards: [], startRewards: [] }], n);
    expect(out[0]?.completionType).toBeUndefined();
  });
});
