import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@shared/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import Consumable from "@/extensions/consumable";
import { GunEmptyEvent } from "@shared/events/server-sent/gun-empty-event";
import Inventory from "@/extensions/inventory";
import { ItemState } from "@/types/entity";

export class FireExtinguisher extends Entity {
  private static readonly EXTINGUISH_RADIUS = 64;
  private static readonly SIZE = new Vector2(16, 16);
  public static readonly DEFAULT_COUNT = 5;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.FIRE_EXTINGUISHER);

    const count = itemState?.count ?? FireExtinguisher.DEFAULT_COUNT;

    this.extensions = [
      new Positionable(this).setSize(FireExtinguisher.SIZE),
      new Interactive(this)
        .onInteract(this.interact.bind(this))
        .setDisplayName("fire extinguisher"),
      new Carryable(this, "fire_extinguisher").setItemState({
        count,
      }),
      new Consumable(this).onConsume(this.consume.bind(this)),
    ];
  }

  private interact(entityId: string): void {
    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped items
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, FireExtinguisher.DEFAULT_COUNT)
    );
  }

  private consume(entityId: string, idx: number): void {
    const player = this.getEntityManager().getEntityById(entityId);
    if (!player) return;

    const inventory = player.getExt(Inventory);
    const extinguisher = inventory.getItems()[idx];

    if (!extinguisher?.state?.count || extinguisher.state.count <= 0) {
      this.getEntityManager().getBroadcaster().broadcastEvent(new GunEmptyEvent(entityId));
      return;
    }

    const position = player.getExt(Positionable).getCenterPosition();
    const nearbyFires = this.getEntityManager().getNearbyEntities(
      position,
      FireExtinguisher.EXTINGUISH_RADIUS,
      [Entities.FIRE]
    );

    for (const fire of nearbyFires) {
      this.getEntityManager().markEntityForRemoval(fire);
    }

    const newCount = extinguisher.state.count - 1;
    inventory.updateItemState(idx, { count: newCount });
  }
}
