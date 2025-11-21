import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { Direction } from "@shared/util/direction";
import Inventory from "@/extensions/inventory";
import { normalizeDirection } from "@shared/util/direction";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { ItemState } from "@/types/entity";
import { ThrowingKnifeProjectile } from "@/entities/projectiles/throwing-knife-projectile";

export class ThrowingKnife extends Weapon {
  private static readonly THROW_SPEED = 200;
  private static readonly COOLDOWN = 0.5;
  private static readonly DEFAULT_COUNT = 5;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "throwing_knife");

    // Make throwing knives stackable by setting count from itemState or default
    if (this.hasExt(Carryable)) {
      const carryable = this.getExt(Carryable);
      const count = itemState?.count ?? ThrowingKnife.DEFAULT_COUNT;
      carryable.setItemState({ count });
    }

    // Override Interactive callback to use merge strategy for stacking
    if (this.hasExt(Interactive)) {
      const interactive = this.getExt(Interactive);
      interactive.onInteract((entityId: number) => {
        const carryable = this.getExt(Carryable);
        carryable.pickup(
          entityId,
          Carryable.createStackablePickupOptions(carryable, ThrowingKnife.DEFAULT_COUNT)
        );
      });
    }
  }

  public getCooldown(): number {
    return ThrowingKnife.COOLDOWN;
  }

  public attack(
    playerId: number,
    position: { x: number; y: number },
    facing: Direction,
    aimAngle?: number
  ): void {
    const player = this.getEntityManager().getEntityById(playerId);
    if (!player || !player.hasExt(Positionable)) return;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const inventory = player.getExt(Inventory);

    // Find the throwing knife in inventory
    const inventoryItems = inventory.getItems();
    const knifeIndex = inventoryItems.findIndex((item) => item && item.itemType === this.getType());
    if (knifeIndex === -1) return;

    const knifeItem = inventoryItems[knifeIndex];
    if (!knifeItem) return;

    // Decrement count for stackable throwing knives
    const currentCount = knifeItem.state?.count || 1;
    if (currentCount > 1) {
      inventory.updateItemState(knifeIndex, { count: currentCount - 1 });
    } else {
      inventory.removeItem(knifeIndex);
    }

    // Create and launch the throwing knife projectile
    const throwingKnife = new ThrowingKnifeProjectile(this.getGameManagers());
    throwingKnife.setPosition(playerPos);

    // Use aimAngle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      throwingKnife.setDirectionFromAngle(aimAngle);
    } else {
      throwingKnife.setDirection(facing);
    }

    throwingKnife.setShooterId(playerId);
    this.getEntityManager().addEntity(throwingKnife);
  }
}
