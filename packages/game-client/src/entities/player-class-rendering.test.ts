import { describe, expect, it } from "vitest";

import { PLAYER_COLORS, SKIN_TYPES } from "@shared/commands/commands";

import { resolvePlayerAssetKey } from "./player";

describe("resolvePlayerAssetKey", () => {
  it("uses the selected class sprite for living human players", () => {
    expect(
      resolvePlayerAssetKey({
        isZombie: false,
        playerClassId: "medic",
        playerColor: PLAYER_COLORS.NONE,
        skin: SKIN_TYPES.DEFAULT,
      }),
    ).toBe("player_medic");
  });

  it("keeps player color variants for class sprites", () => {
    expect(
      resolvePlayerAssetKey({
        isZombie: false,
        playerClassId: "scavenger",
        playerColor: PLAYER_COLORS.BLUE,
        skin: SKIN_TYPES.DEFAULT,
      }),
    ).toBe("player_scavenger_blue");
  });

  it("keeps zombie and wdc overrides ahead of class appearance", () => {
    expect(
      resolvePlayerAssetKey({
        isZombie: true,
        playerClassId: "survivor",
        playerColor: PLAYER_COLORS.NONE,
        skin: SKIN_TYPES.DEFAULT,
      }),
    ).toBe("grave_tyrant");

    expect(
      resolvePlayerAssetKey({
        isZombie: false,
        playerClassId: "medic",
        playerColor: PLAYER_COLORS.GREEN,
        skin: SKIN_TYPES.WDC,
      }),
    ).toBe("player_wdc_green");
  });
});
