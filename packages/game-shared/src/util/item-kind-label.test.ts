import { describe, expect, it } from "vitest";
import "../entities";
import { getItemKindLabel } from "./item-kind-label";

describe("getItemKindLabel", () => {
  it("prefers resource registry over misleading item category (wood)", () => {
    expect(getItemKindLabel("wood")).toBe("Resource");
  });

  it("labels weapons by loadout and ranged/melee", () => {
    expect(getItemKindLabel("knife")).toBe("Melee weapon");
    expect(getItemKindLabel("pistol")).toBe("Secondary weapon · Ranged");
  });

  it("labels consumables", () => {
    expect(getItemKindLabel("bandage")).toBe("Consumable");
  });

  it("labels armor by equipment slot", () => {
    expect(getItemKindLabel("patchwork_vest")).toBe("Body armor");
  });

  it("labels coin as currency", () => {
    expect(getItemKindLabel("coin")).toBe("Currency");
  });

  it("falls back for unknown ids", () => {
    expect(getItemKindLabel("totally_unknown_item_type_zzz")).toBe("Item");
  });
});
