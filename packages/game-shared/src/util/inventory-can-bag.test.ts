import { describe, expect, it } from "vitest";
import { canBagAcceptItem, canBagAcceptCoinCount } from "./inventory";
import type { InventoryItem } from "./inventory";

describe("canBagAcceptItem", () => {
  it("accepts into empty slot", () => {
    const bag: (InventoryItem | null)[] = [null, null];
    expect(canBagAcceptItem(bag, 2, { itemType: "torch" })).toBe(true);
  });

  it("merges stackable ammo", () => {
    const bag: (InventoryItem | null)[] = [{ itemType: "pistol_ammo", state: { count: 5 } }, null];
    expect(canBagAcceptItem(bag, 2, { itemType: "pistol_ammo", state: { count: 3 } })).toBe(true);
  });

  it("rejects when full and no merge", () => {
    const bag: (InventoryItem | null)[] = [{ itemType: "torch" }, { itemType: "wood" }];
    expect(canBagAcceptItem(bag, 2, { itemType: "bandage" })).toBe(false);
  });
});

describe("canBagAcceptCoinCount", () => {
  it("merges coins", () => {
    const bag: (InventoryItem | null)[] = [{ itemType: "coin", state: { count: 5 } }];
    expect(canBagAcceptCoinCount(bag, 4, 10)).toBe(true);
  });
});
