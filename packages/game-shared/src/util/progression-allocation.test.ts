import { describe, expect, it } from "vitest";
import {
  normalizeAbilityAllocations,
  validateAbilityAllocations,
  normalizeCharacterAllocations,
  validateCharacterAllocations,
} from "./progression-allocation";

describe("progression-allocation", () => {
  it("allows ability spend within budget from XP", () => {
    const xp = 5;
    const a = normalizeAbilityAllocations({ sprint: 1 });
    expect(validateAbilityAllocations(a, xp)).toBeNull();
  });

  it("rejects ability overspend", () => {
    const xp = 5;
    const a = normalizeAbilityAllocations({ sprint: 1, regenerate: 1 });
    expect(validateAbilityAllocations(a, xp)).not.toBeNull();
  });

  it("rejects unknown ability keys", () => {
    const a = normalizeAbilityAllocations({ sprint: 1, mystery: 2 });
    expect(a).toEqual({ sprint: 1 });
  });

  it("allows character stat spend within budget", () => {
    const xp = 12;
    const a = normalizeCharacterAllocations({ health: 1, evade: 1 });
    expect(validateCharacterAllocations(a, xp)).toBeNull();
  });
});
