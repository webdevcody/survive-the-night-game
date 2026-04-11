import { describe, expect, it } from "vitest";
import {
  cumulativeProfessionXpToReachLevel,
  emptyProfessionProgress,
  getProfessionDetails,
  getProfessionLevelFromXp,
  getProfessionXpToAdvanceFromLevel,
  normalizeProfessionProgress,
} from "./professions";

describe("professions", () => {
  it("starts every profession at 0 XP", () => {
    expect(emptyProfessionProgress()).toEqual({
      scavenging: 0,
      scrapping: 0,
      crafting: 0,
      gunsmithing: 0,
      chemistry: 0,
      tailoring: 0,
      cooking: 0,
      engineering: 0,
    });
  });

  it("uses the profession XP curve for level thresholds", () => {
    expect(getProfessionXpToAdvanceFromLevel(1)).toBe(10);
    expect(getProfessionLevelFromXp(0)).toBe(1);
    expect(getProfessionLevelFromXp(9)).toBe(1);
    expect(getProfessionLevelFromXp(10)).toBe(2);
    expect(getProfessionLevelFromXp(cumulativeProfessionXpToReachLevel(5))).toBe(5);
  });

  it("normalizes profession progress and exposes the next unlock", () => {
    const progress = normalizeProfessionProgress({
      scavenging: cumulativeProfessionXpToReachLevel(5),
      engineering: 42.9,
      ignored: 999,
    });
    const scavenging = getProfessionDetails("scavenging", progress);
    expect(scavenging.level).toBe(5);
    expect(scavenging.unlockedRecipes.map((unlock) => unlock.recipeId)).toEqual([
      "forager_wraps",
      "scout_pack",
    ]);
    expect(scavenging.nextUnlock?.recipeId).toBe("tracker_boots");
    expect(progress.engineering).toBe(42);
  });
});

