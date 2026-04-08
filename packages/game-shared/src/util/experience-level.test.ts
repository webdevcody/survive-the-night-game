import { describe, it, expect } from "vitest";
import {
  getLevelFromTotalExperience,
  getExperienceProgress,
  getXpToAdvanceFromLevel,
  cumulativeXpToReachLevel,
} from "./experience-level";

describe("experience-level", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(getLevelFromTotalExperience(0)).toBe(1);
    const p = getExperienceProgress(0);
    expect(p.level).toBe(1);
    expect(p.currentXpInLevel).toBe(0);
    expect(p.xpToNextLevel).toBe(5);
  });

  it("stays level 1 for XP 1–4", () => {
    for (const x of [1, 2, 3, 4]) {
      expect(getLevelFromTotalExperience(x)).toBe(1);
      expect(getExperienceProgress(x).level).toBe(1);
    }
  });

  it("reaches level 2 at 5 total XP", () => {
    expect(getLevelFromTotalExperience(5)).toBe(2);
    const p = getExperienceProgress(5);
    expect(p.level).toBe(2);
    expect(p.currentXpInLevel).toBe(0);
    expect(p.xpToNextLevel).toBe(getXpToAdvanceFromLevel(2));
  });

  it("level 1→2 step is exactly 5 XP", () => {
    expect(getXpToAdvanceFromLevel(1)).toBe(5);
    expect(cumulativeXpToReachLevel(2)).toBe(5);
  });

  it("xp to next level increases after level 1", () => {
    expect(getXpToAdvanceFromLevel(2)).toBeGreaterThan(getXpToAdvanceFromLevel(1));
    expect(getXpToAdvanceFromLevel(3)).toBeGreaterThan(getXpToAdvanceFromLevel(2));
  });

  it("progress bar fraction is between 0 and 1 for partial level", () => {
    const p = getExperienceProgress(2);
    expect(p.level).toBe(1);
    expect(p.currentXpInLevel / p.xpToNextLevel).toBeCloseTo(2 / 5, 5);
  });
});
