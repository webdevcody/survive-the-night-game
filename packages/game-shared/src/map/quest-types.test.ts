import { describe, expect, it } from "vitest";
import { createQuestDefinitionDraft } from "./quest-types";

describe("createQuestDefinitionDraft", () => {
  it("creates a valid starter quest with a default objective", () => {
    expect(createQuestDefinitionDraft("quest_intro", "Scout the path")).toEqual({
      id: "quest_intro",
      title: "Scout the path",
      steps: [{ type: "pickup_item", itemType: "bandage" }],
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
