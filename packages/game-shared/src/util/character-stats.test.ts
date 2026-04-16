import { describe, expect, it } from "vitest";
import {
  computeMaxPlayerHealth,
  computeEvadeChance,
  computeMaxStamina,
  computePassiveHpRegenIntervalSeconds,
  computeMaxInventorySlots,
  computeTotalEvadeChance,
  computeArmorEvadeBonusFromEquipment,
  computeRawStatEvadeChance,
  CHARACTER_STAT_MODIFIERS,
} from "./character-stats";
import { normalizeCharacterAllocations } from "./progression-allocation";
import { createEmptyEquipment } from "./inventory";

describe("character-stats helpers", () => {
  it("computes max HP +1 per point", () => {
    expect(computeMaxPlayerHealth(10, 3)).toBe(13);
  });

  it("caps evade chance", () => {
    expect(computeEvadeChance(0)).toBe(0);
    expect(computeEvadeChance(100)).toBeLessThanOrEqual(0.65);
  });

  it("total evade adds armor flat bonus and caps once", () => {
    const eq = createEmptyEquipment();
    expect(computeTotalEvadeChance(10, eq)).toBe(computeEvadeChance(10));
    eq.torso = { itemType: "patchwork_vest" };
    const bonus = CHARACTER_STAT_MODIFIERS.armorEvadeChancePerEquippedPiece;
    expect(computeArmorEvadeBonusFromEquipment(eq)).toBe(bonus);
    expect(computeTotalEvadeChance(10, eq)).toBe(computeRawStatEvadeChance(10) + bonus);
  });

  it("total evade respects global cap with stat near max", () => {
    const eq = createEmptyEquipment();
    const pts = 93;
    expect(computeRawStatEvadeChance(pts)).toBeGreaterThan(CHARACTER_STAT_MODIFIERS.evadeMaxChance);
    expect(computeEvadeChance(pts)).toBe(CHARACTER_STAT_MODIFIERS.evadeMaxChance);
    for (let i = 0; i < 7; i++) {
      const keys = [
        "head",
        "shoulders",
        "torso",
        "legs",
        "shoes",
        "back",
        "hands",
      ] as const;
      eq[keys[i]!] = { itemType: "patchwork_vest" };
    }
    expect(computeTotalEvadeChance(pts, eq)).toBe(CHARACTER_STAT_MODIFIERS.evadeMaxChance);
  });

  it("computes max stamina from stat points", () => {
    expect(computeMaxStamina(100, 5)).toBe(110);
  });

  it("reduces passive HP interval with hpRecovery points", () => {
    const a = computePassiveHpRegenIntervalSeconds(0);
    const b = computePassiveHpRegenIntervalSeconds(20);
    expect(b).toBeLessThan(a);
    expect(b).toBeGreaterThanOrEqual(2);
  });

  it("strength adds inventory slots", () => {
    expect(computeMaxInventorySlots(40, 3)).toBe(43);
  });

  it("normalizes legacy defence into evade", () => {
    const a = normalizeCharacterAllocations({ defence: 2 });
    expect(a.evade).toBe(2);
  });
});
