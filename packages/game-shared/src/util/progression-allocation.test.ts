import { describe, expect, it } from "vitest";
import {
  normalizeSkillAllocations,
  validateSkillAllocations,
  normalizeCharacterAllocations,
  validateCharacterAllocations,
} from "./progression-allocation";

describe("progression-allocation", () => {
  it("allows skill spend within budget from XP", () => {
    const xp = 5;
    const a = normalizeSkillAllocations({ sprint: 1 });
    expect(validateSkillAllocations(a, xp)).toBeNull();
  });

  it("rejects skill overspend", () => {
    const xp = 5;
    const a = normalizeSkillAllocations({ sprint: 1, regenerate: 1 });
    expect(validateSkillAllocations(a, xp)).not.toBeNull();
  });

  it("allows character stat spend within budget", () => {
    const xp = 12;
    const a = normalizeCharacterAllocations({ health: 1, evade: 1 });
    expect(validateCharacterAllocations(a, xp)).toBeNull();
  });
});
