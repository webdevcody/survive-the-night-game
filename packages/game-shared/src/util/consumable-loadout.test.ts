import { describe, expect, it } from "vitest";
import "../entities";
import { ITEM_CONFIGS } from "../entities/item-configs";
import { itemMatchesConsumableLoadout } from "./consumable-loadout";

describe("wearable item config invariants", () => {
  it("types every wearable as armor", () => {
    const mistypedWearables = Object.values(ITEM_CONFIGS)
      .filter((item) => item.wearable === true)
      .map((item) => ({ id: item.id, category: item.category }))
      .filter((item) => item.category !== "armor");

    expect(mistypedWearables).toEqual([]);
  });

  it("assigns every wearable to an equipment slot", () => {
    const wearablesMissingSlots = Object.values(ITEM_CONFIGS)
      .filter((item) => item.wearable === true)
      .map((item) => ({ id: item.id, equipmentSlot: item.equipmentSlot ?? null }))
      .filter((item) => item.equipmentSlot === null);

    expect(wearablesMissingSlots).toEqual([]);
  });
});

describe("itemMatchesConsumableLoadout", () => {
  it("keeps wearables out of quick slots", () => {
    expect(itemMatchesConsumableLoadout("cloth_hood")).toBe(false);
    expect(itemMatchesConsumableLoadout("miners_hat")).toBe(false);
  });

  it("still allows real consumables in quick slots", () => {
    expect(itemMatchesConsumableLoadout("bandage")).toBe(true);
    expect(itemMatchesConsumableLoadout("pain_pills")).toBe(true);
    expect(itemMatchesConsumableLoadout("energy_drink")).toBe(true);
  });
});
