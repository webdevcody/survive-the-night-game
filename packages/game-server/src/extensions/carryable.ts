import { Extension } from "@/extensions/types";
import { PlayerPickedUpItemEvent } from "../../../game-shared/src/events/server-sent/events/pickup-item-event";
import Inventory from "@/extensions/inventory";
import { ItemType } from "@/util/inventory";
import { IEntity } from "@/entities/types";
import { ItemState } from "@/types/entity";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { itemTypeRegistry } from "@shared/util/item-type-encoding";
import { writeItemState } from "@shared/util/item-state-serialization";
import {
  canItemGoInEquipmentSlot,
  EQUIPMENT_SLOT_KEYS,
  type EquipmentSlotKey,
} from "@shared/util/inventory";
import { ExtensionBase } from "./extension-base";
import { Player } from "@/entities/players/player";
import { advancePickupStep } from "@/quests/quest-runtime";
import {
  getWeaponLoadoutSlotKey,
  weaponLoadoutSlotKeyToIndex,
} from "@shared/util/weapon-loadout";

/**
 * When the unlocked visible grid is full, still allow ground pickup if the item is a weapon whose
 * hotbar row is empty and there is space in loadout-reserved bag cells (same accessible range as
 * {@link Inventory.getMaxSlots} for players).
 */
function canPlaceWeaponInLoadoutReservedBagBecauseRowEmpty(
  entity: IEntity,
  itemType: ItemType,
): boolean {
  const loadoutKey = getWeaponLoadoutSlotKey(itemType);
  if (loadoutKey == null) {
    return false;
  }
  const row = weaponLoadoutSlotKeyToIndex(loadoutKey);
  const key =
    row === 0
      ? "weaponLoadoutPrimary"
      : row === 1
        ? "weaponLoadoutSecondary"
        : "weaponLoadoutMelee";
  const ser = (entity as { getSerialized?: () => { get: (k: string) => unknown } }).getSerialized?.();
  if (!ser) {
    return false;
  }
  const ref = ser.get(key);
  return ref === 0;
}

function tryAutoEquipWearableFromBag(
  entity: IEntity,
  inventory: Inventory,
  bagIndex: number,
  itemType: ItemType,
): void {
  const equipment = inventory.getEquipment();
  const owner = entity as {
    canEquipItemToSlot?: (itemType: ItemType, equipSlot: EquipmentSlotKey) => boolean;
  };
  for (const slot of EQUIPMENT_SLOT_KEYS) {
    if (equipment[slot] != null) {
      continue;
    }
    if (!canItemGoInEquipmentSlot(itemType, slot)) {
      continue;
    }
    if (owner.canEquipItemToSlot?.(itemType, slot) === false) {
      continue;
    }
    inventory.swapBagAndEquipment(bagIndex, slot);
    return;
  }
}

interface PickupOptions {
  state?: ItemState;
  mergeStrategy?: (existingState: ItemState, pickupState: ItemState) => ItemState;
}

type CarryableFields = {
  itemType: ItemType;
  state: ItemState;
};

export default class Carryable extends ExtensionBase<CarryableFields> {
  public static readonly type = "carryable" as const;

  public constructor(self: IEntity, itemType: ItemType) {
    super(self, { itemType, state: {} });
  }

  public setItemState(state: ItemState): this {
    this.serialized.set("state", state);
    return this;
  }

  public getItemState(): ItemState {
    return this.serialized.get("state");
  }

  public getItemType(): ItemType {
    return this.serialized.get("itemType");
  }

  /**
   * Creates pickup options for stackable items that preserve count when dropped and picked up.
   * This ensures that when a stacked item is dropped and picked back up, it maintains its count.
   */
  public static createStackablePickupOptions(
    carryable: Carryable,
    defaultCount: number
  ): PickupOptions {
    const currentCount = carryable.getItemState().count ?? defaultCount;
    return {
      state: { count: currentCount },
      mergeStrategy: (existing, pickup) => ({
        count: (existing?.count || 0) + (pickup?.count || defaultCount),
      }),
    };
  }

  public pickup(entityId: number, options?: PickupOptions): boolean {
    const itemType = this.serialized.get("itemType");

    // Prevent crash if itemType is null (entity may be in invalid state)
    if (!itemType) {
      console.warn("Attempted to pickup item with null itemType");
      return false;
    }

    const entity = this.self.getEntityManager().getEntityById(entityId);
    if (!entity) {
      return false;
    }

    const inventory = entity.getExt(Inventory);
    const pickupMaxSlots = inventory.getPickupMaxSlots();
    if (pickupMaxSlots <= 0) {
      return false;
    }

    // If we have a merge strategy and existing item, merge instead of adding new
    if (options?.mergeStrategy) {
      const existingItemIndex = inventory.findItemIndex(itemType, pickupMaxSlots);
      if (existingItemIndex >= 0) {
        const existingItem = inventory.getItems()[existingItemIndex];
        if (existingItem) {
          const newState = options.mergeStrategy(existingItem.state ?? {}, options.state ?? {});
          inventory.updateItemState(existingItemIndex, newState);
          this.self.getEntityManager().markEntityForRemoval(this.self);
          if (entity instanceof Player) {
            advancePickupStep(entity, itemType, entity.getGameManagers().getMapManager());
          }
          return true;
        }
      }
    }

    // Otherwise add as new item: prefer unlocked visible cells, then loadout-reserved tail if this
    // weapon can auto-equip to an empty hotbar row (visible grid may be full).
    let emptySlotIndex = inventory.findFirstEmptyBagSlot(pickupMaxSlots);
    if (
      emptySlotIndex < 0 &&
      canPlaceWeaponInLoadoutReservedBagBecauseRowEmpty(entity, itemType)
    ) {
      emptySlotIndex = inventory.findFirstEmptyBagSlot(inventory.getMaxSlots());
    }
    if (emptySlotIndex < 0) {
      return false;
    }

    const pickupState = options?.state ?? this.getItemState();

    // setBagSlot may auto-fill an empty weapon hotbar row; wearable-to-armor swap runs next on the same cell index.
    inventory.setBagSlot(emptySlotIndex, {
      itemType: itemType,
      state: pickupState,
    });

    tryAutoEquipWearableFromBag(entity, inventory, emptySlotIndex, itemType);

    this.self.getEntityManager().markEntityForRemoval(this.self);

    this.self
      .getEntityManager()
      .getBroadcaster()
      .broadcastEvent(
        new PlayerPickedUpItemEvent({
          playerId: entityId,
          itemType: itemType,
        })
      );

    if (entity instanceof Player) {
      advancePickupStep(entity, itemType, entity.getGameManagers().getMapManager());
    }

    return true;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Carryable.type));
    writer.writeUInt8(itemTypeRegistry.encode(this.serialized.get("itemType")));
    writeItemState(writer, this.serialized.get("state"));
  }
}
