import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Inventory from "@/extensions/inventory";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Player } from "@/entities/players/player";
import { PlayerPickedUpItemEvent } from "@shared/events/server-sent/events/pickup-item-event";

export class Tree extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.TREE);
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("wood")
        .setAutoPickupEnabled(false)
    );
  }

  private interact(entityId: number): void {
    const player = this.getEntityManager().getEntityById(entityId) as Player;
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const itemType = "wood";
    const pickupMaxSlots = inventory.getPickupMaxSlots();
    const existingItemIndex = inventory.findItemIndex(itemType, pickupMaxSlots);
    if (existingItemIndex >= 0) {
      const existingItem = inventory.getItems()[existingItemIndex];
      if (!existingItem) {
        return;
      }
      const currentCount = existingItem.state?.count ?? 0;
      inventory.updateItemState(existingItemIndex, { count: currentCount + 1 });
    } else {
      const emptySlotIndex = inventory.findFirstEmptyBagSlot(pickupMaxSlots);
      if (emptySlotIndex < 0) {
        return;
      }
      inventory.setBagSlot(emptySlotIndex, { itemType, state: { count: 1 } });
    }

    this.getEntityManager().getBroadcaster().broadcastEvent(
      new PlayerPickedUpItemEvent({
        playerId: player.getId(),
        itemType,
      })
    );
    player.addProfessionXp("scavenging", 3);
    this.getEntityManager().markEntityForRemoval(this);
  }
}
