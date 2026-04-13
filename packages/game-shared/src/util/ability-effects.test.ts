import { describe, expect, it } from "vitest";
import { isSneakActive } from "./ability-effects";

describe("isSneakActive", () => {
  it("requires the sneak ability before sneak applies", () => {
    expect(
      isSneakActive({
        isZombie: false,
        hasSneakAbility: false,
        isSneakInputActive: true,
      }),
    ).toBe(false);
  });

  it("does not apply to zombies", () => {
    expect(
      isSneakActive({
        isZombie: true,
        hasSneakAbility: true,
        isSneakInputActive: true,
      }),
    ).toBe(false);
  });

  it("applies for human players who unlocked the ability and hold the input", () => {
    expect(
      isSneakActive({
        isZombie: false,
        hasSneakAbility: true,
        isSneakInputActive: true,
      }),
    ).toBe(true);
  });
});
