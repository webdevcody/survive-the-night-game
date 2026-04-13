import { describe, expect, it, vi } from "vitest";
import type { Extension } from "@/extensions/types";
import type { IEntity } from "@/entities/types";
import type { Broadcaster, IEntityManager } from "@/managers/types";
import Carryable from "./carryable";
import Inventory from "./inventory";

type TestPlayerEntity = IEntity & {
  getAccessibleInventorySlotCount(): number;
  getUnlockedVisibleBagSlotCount(): number;
};

function createEntity(overrides: Partial<IEntity>): IEntity {
  return Object.assign(new EventTarget(), {
    getType: () => "test_entity" as any,
    getId: () => 0,
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

function createCarryablePickupHarness(itemType: string) {
  const broadcaster = {
    broadcastEvent: vi.fn(),
  } as unknown as Broadcaster;

  let inventory!: Inventory;

  const player = createEntity({
    getId: () => 1,
    getAccessibleInventorySlotCount: () => 10,
    getUnlockedVisibleBagSlotCount: () => 5,
    getExt: <T>(ext: { new (...args: any[]): T }): T => {
      if (ext === Inventory) {
        return inventory as T;
      }
      throw new Error("Extension not found");
    },
  }) as TestPlayerEntity;

  const entityManager = {
    getEntityById: (entityId: number) => (entityId === 1 ? player : null),
    getBroadcaster: () => broadcaster,
    markEntityForRemoval: vi.fn(),
  } as unknown as IEntityManager;

  const pickupEntity = createEntity({
    getId: () => 99,
    getEntityManager: () => entityManager,
  });

  inventory = new Inventory(player, broadcaster);
  const carryable = new Carryable(pickupEntity, itemType);

  return {
    broadcaster,
    carryable,
    entityManager,
    inventory,
  };
}

describe("Carryable pickup bag locking", () => {
  it("rejects pickup when only locked slots are empty", () => {
    const { carryable, entityManager, inventory } = createCarryablePickupHarness("bandage");

    for (let i = 0; i < 5; i++) {
      inventory.setBagSlot(i, { itemType: `filled_${i}` });
    }

    expect(carryable.pickup(1)).toBe(false);
    expect(entityManager.markEntityForRemoval).not.toHaveBeenCalled();
    expect(inventory.getItems()[5]).toBeNull();
  });

  it("does not merge a pickup into a locked slot stack", () => {
    const { carryable, entityManager, inventory } = createCarryablePickupHarness("coin");

    carryable.setItemState({ count: 4 });
    for (let i = 0; i < 5; i++) {
      inventory.setBagSlot(i, { itemType: `filled_${i}` });
    }
    inventory.setBagSlot(5, { itemType: "coin", state: { count: 10 } });

    expect(carryable.pickup(1, Carryable.createStackablePickupOptions(carryable, 4))).toBe(false);
    expect(entityManager.markEntityForRemoval).not.toHaveBeenCalled();
    expect(inventory.getItems()[5]).toEqual({ itemType: "coin", state: { count: 10 } });
  });

  it("still merges a pickup into an unlocked visible stack", () => {
    const { carryable, entityManager, inventory } = createCarryablePickupHarness("coin");

    carryable.setItemState({ count: 4 });
    inventory.setBagSlot(0, { itemType: "coin", state: { count: 10 } });
    for (let i = 1; i < 5; i++) {
      inventory.setBagSlot(i, { itemType: `filled_${i}` });
    }

    expect(carryable.pickup(1, Carryable.createStackablePickupOptions(carryable, 4))).toBe(true);
    expect(entityManager.markEntityForRemoval).toHaveBeenCalledTimes(1);
    expect(inventory.getItems()[0]).toEqual({ itemType: "coin", state: { count: 14 } });
  });

  it("auto-equips a wearable when its equipment slot is empty", () => {
    const { carryable, entityManager, inventory } = createCarryablePickupHarness("dust_mask");

    expect(carryable.pickup(1)).toBe(true);
    expect(entityManager.markEntityForRemoval).toHaveBeenCalledTimes(1);
    expect(inventory.getItems()[0]).toBeNull();
    expect(inventory.getEquipment().head).toEqual({ itemType: "dust_mask", state: {} });
  });

  it("leaves a wearable in the bag when its equipment slot is already filled", () => {
    const { carryable, entityManager, inventory } = createCarryablePickupHarness("dust_mask");

    inventory.setEquipmentSlot("head", { itemType: "miners_hat", state: {} });

    expect(carryable.pickup(1)).toBe(true);
    expect(entityManager.markEntityForRemoval).toHaveBeenCalledTimes(1);
    expect(inventory.getItems()[0]).toEqual({ itemType: "dust_mask", state: {} });
    expect(inventory.getEquipment().head?.itemType).toBe("miners_hat");
  });
});
