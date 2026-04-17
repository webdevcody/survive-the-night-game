import { describe, expect, it } from "vitest";

import { PLAYER_CLASS_IDS, coercePlayerClassId, isPlayerClassId } from "./player-class";

describe("player-class", () => {
  it("accepts supported class ids", () => {
    expect(PLAYER_CLASS_IDS).toEqual(["survivor", "scavenger", "medic"]);
    expect(isPlayerClassId("survivor")).toBe(true);
    expect(isPlayerClassId("scavenger")).toBe(true);
    expect(isPlayerClassId("medic")).toBe(true);
  });

  it("defaults invalid values to survivor", () => {
    expect(coercePlayerClassId(undefined)).toBe("survivor");
    expect(coercePlayerClassId("bogus")).toBe("survivor");
  });
});
