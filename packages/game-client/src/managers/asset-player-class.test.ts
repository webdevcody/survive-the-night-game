import { describe, expect, it } from "vitest";

import { assetsMap } from "./asset";

describe("class player assets", () => {
  it("registers sprite keys for each class body and tinted variant", () => {
    expect(assetsMap).toHaveProperty("player_survivor");
    expect(assetsMap).toHaveProperty("player_scavenger");
    expect(assetsMap).toHaveProperty("player_medic");
    expect(assetsMap).toHaveProperty("player_medic_blue");
  });
});
