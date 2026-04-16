import { describe, expect, it } from "vitest";
import { resourceRegistry } from "../entities/resource-registry";
import { weaponRegistry } from "../entities/weapon-registry";
import { DECAL_TILE_NONE, DECAL_TILE_SCAVENGE } from "./decal-palette";
import {
  normalizeScavengeDecals,
  reconcileScavengeDecalsWithDecalsLayer,
  DEFAULT_SCAVENGE_DECAL_DROP_MIN,
} from "./world-map-types";

describe("scavenge decals map helpers", () => {
  it("reconcile keeps only scavenge decal cells", () => {
    const n = 4;
    const decals = Array(n)
      .fill(0)
      .map(() => Array(n).fill(DECAL_TILE_NONE));
    decals[1][2] = DECAL_TILE_SCAVENGE;
    decals[3][3] = DECAL_TILE_SCAVENGE;

    const raw = [
      { row: 1, col: 2, dropCountMin: 2, dropCountMax: 2 },
      { row: 9, col: 9, dropCountMin: 5 },
    ];

    const out = reconcileScavengeDecalsWithDecalsLayer(decals, raw, n);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ row: 1, col: 2, dropCountMin: 2, dropCountMax: 2 });
    expect(out[1]).toEqual({ row: 3, col: 3 });
  });

  it("normalize drops invalid drop table rows", () => {
    const entries = normalizeScavengeDecals(
      [
        {
          row: 0,
          col: 0,
          dropTable: [
            { itemType: "wood", weight: 1 },
            { itemType: "not_a_real_item_ever", weight: 10 },
            { itemType: "cloth", weight: 0 },
          ],
        },
      ],
      8,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]!.dropTable).toEqual([{ itemType: "wood", weight: 1 }]);
  });

  it("normalize keeps weapon ids (same union as map editor typeahead)", () => {
    const weaponId = weaponRegistry.getAllWeaponTypes()[0];
    expect(weaponId).toBeTruthy();
    const entries = normalizeScavengeDecals(
      [{ row: 0, col: 0, dropTable: [{ itemType: weaponId!, weight: 2 }] }],
      8,
    );
    expect(entries[0]!.dropTable).toEqual([{ itemType: weaponId!, weight: 2 }]);
  });

  it("normalize keeps resource ids", () => {
    const resourceId = resourceRegistry.getAllResourceTypes()[0];
    expect(resourceId).toBeTruthy();
    const entries = normalizeScavengeDecals(
      [{ row: 0, col: 0, dropTable: [{ itemType: resourceId!, weight: 1 }] }],
      8,
    );
    expect(entries[0]!.dropTable).toEqual([{ itemType: resourceId!, weight: 1 }]);
  });

  it("normalize coerces drop count range", () => {
    const entries = normalizeScavengeDecals(
      [{ row: 0, col: 0, dropCountMin: 5, dropCountMax: 2 }],
      8,
    );
    expect(entries[0]!.dropCountMin).toBe(2);
    expect(entries[0]!.dropCountMax).toBe(5);
  });

  it("exports default drop min for callers", () => {
    expect(DEFAULT_SCAVENGE_DECAL_DROP_MIN).toBe(1);
  });
});
