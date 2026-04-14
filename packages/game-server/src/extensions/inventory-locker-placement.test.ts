import { describe, expect, it, vi } from "vitest";
import type { Extension } from "@/extensions/types";
import type { IEntity } from "@/entities/types";
import type { Broadcaster, IEntityManager } from "@/managers/types";
import Inventory from "./inventory";

function createEntity(overrides: Partial<IEntity>): IEntity {
  return Object.assign(new EventTarget(), {
    getType: () => "test_entity" as any,
    getId: () => 1,
    getEntityManager: () => ({}) as IEntityManager,
    getGameManagers: () => ({}) as any,
    getCategory: () => "item" as any,
    addExtension: (_extension: Extension) => {},
    removeExtension: (_extension: Extension) => {},
    getExtensions: () => [],
    hasExt: () => false,
    getExt: () => {
      throw new Error("Extension not found");
    },
    isDirty: () => false,
    markExtensionDirty: (_extension: Extension) => {},
    clearDirtyFlags: () => {},
    serializeToBuffer: () => {},
    isMarkedForRemoval: () => false,
    ...overrides,
  }) as unknown as IEntity;
}

describe("Inventory locker placement options", () => {
  it("addItem with locker options does not call tryAutoEquipPickedUpWeaponIfLoadoutRowEmpty", () => {
    const tryAuto = vi.fn();
    const broadcaster = { broadcastEvent: vi.fn() } as unknown as Broadcaster;
    const player = createEntity({
      getId: () => 42,
      getAccessibleInventorySlotCount: () => 10,
      getUnlockedVisibleBagSlotCount: () => 5,
      tryAutoEquipPickedUpWeaponIfLoadoutRowEmpty: tryAuto,
      sanitizeWeaponLoadouts: () => {},
      compactLoadoutBackedItemsToBagEnd: () => {},
      getExt: function <T>(ext: { new (...args: any[]): T }): T {
        if (ext === Inventory) {
          return (this as any).__inv as T;
        }
        throw new Error("Extension not found");
      },
    }) as IEntity & { __inv: Inventory };

    const inventory = new Inventory(player, broadcaster);
    (player as any).__inv = inventory;

    const ok = inventory.addItem({ itemType: "pistol" }, {
      autoEquipWeaponIfLoadoutEmpty: false,
      maxEmptySlotSearchExclusive: 5,
    });

    expect(ok).toBe(true);
    expect(tryAuto).not.toHaveBeenCalled();
  });

  it("addItem with maxEmptySlotSearchExclusive returns false when only empty cells are past the cap", () => {
    const broadcaster = { broadcastEvent: vi.fn() } as unknown as Broadcaster;
    const player = createEntity({
      getAccessibleInventorySlotCount: () => 10,
      getUnlockedVisibleBagSlotCount: () => 5,
      sanitizeWeaponLoadouts: () => {},
      compactLoadoutBackedItemsToBagEnd: () => {},
      getExt: function <T>(ext: { new (...args: any[]): T }): T {
        if (ext === Inventory) {
          return (this as any).__inv as T;
        }
        throw new Error("Extension not found");
      },
    }) as IEntity & { __inv: Inventory };

    const inventory = new Inventory(player, broadcaster);
    (player as any).__inv = inventory;

    for (let i = 0; i < 5; i++) {
      inventory.setBagSlot(i, { itemType: `x${i}` });
    }

    const ok = inventory.addItem({ itemType: "coin" }, { maxEmptySlotSearchExclusive: 5 });

    expect(ok).toBe(false);
    expect(broadcaster.broadcastEvent).not.toHaveBeenCalled();
    expect(inventory.getItems()[5]).toBeNull();
  });

  it("addOrMergeStack with locker options returns false when merge cannot run and visible cap has no space", () => {
    const broadcaster = { broadcastEvent: vi.fn() } as unknown as Broadcaster;
    const player = createEntity({
      getAccessibleInventorySlotCount: () => 10,
      getUnlockedVisibleBagSlotCount: () => 5,
      sanitizeWeaponLoadouts: () => {},
      compactLoadoutBackedItemsToBagEnd: () => {},
      getExt: function <T>(ext: { new (...args: any[]): T }): T {
        if (ext === Inventory) {
          return (this as any).__inv as T;
        }
        throw new Error("Extension not found");
      },
    }) as IEntity & { __inv: Inventory };

    const inventory = new Inventory(player, broadcaster);
    (player as any).__inv = inventory;

    for (let i = 0; i < 5; i++) {
      inventory.setBagSlot(i, { itemType: `x${i}` });
    }

    const merged = inventory.addOrMergeStack({ itemType: "unique_locker_item" }, {
      autoEquipWeaponIfLoadoutEmpty: false,
      maxEmptySlotSearchExclusive: 5,
    });

    expect(merged).toBe(false);
  });
});
