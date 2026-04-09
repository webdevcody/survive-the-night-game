import { describe, expect, it } from "vitest";
import {
  computeMaxPlayerHealth,
  computeEvadeChance,
  computeMaxStamina,
  computePassiveHpRegenIntervalSeconds,
  computeMaxInventorySlots,
} from "./character-stats";
import { normalizeCharacterAllocations } from "./progression-allocation";

describe("character-stats helpers", () => {
  it("computes max HP +1 per point", () => {
    expect(computeMaxPlayerHealth(10, 3)).toBe(13);
  });

  it("caps evade chance", () => {
    expect(computeEvadeChance(0)).toBe(0);
    expect(computeEvadeChance(100)).toBeLessThanOrEqual(0.65);
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
