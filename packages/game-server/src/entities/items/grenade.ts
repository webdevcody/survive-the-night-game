import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Destructible from "@/extensions/destructible";
import { Direction } from "@shared/util/direction";
import { Cooldown } from "@/entities/util/cooldown";
import Inventory from "@/extensions/inventory";
import { normalizeDirection } from "@shared/util/direction";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { ItemState } from "@/types/entity";
import Groupable from "@/extensions/groupable";

export class Grenade extends Weapon {
  private static readonly EXPLOSION_RADIUS = 64;
  private static readonly EXPLOSION_DAMAGE = 5;
  private static readonly THROW_SPEED = 130;
  private static readonly EXPLOSION_DELAY = 1;
  private static readonly COOLDOWN = 0.5;
  private static readonly DEFAULT_COUNT = 1;

  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isArmed: boolean = false;
  private explosionTimer: Cooldown;
  private isExploded: boolean = false;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "grenade");

    this.explosionTimer = new Cooldown(Grenade.EXPLOSION_DELAY);

    // Add Updatable extension for grenade physics after it's thrown
    this.addExtension(new Updatable(this, this.updateGrenade.bind(this)));

    // Make grenades stackable by setting count from itemState or default
    if (this.hasExt(Carryable)) {
      const carryable = this.getExt(Carryable);
      const count = itemState?.count ?? Grenade.DEFAULT_COUNT;
      carryable.setItemState({ count });
    }

    // Override Interactive callback to use merge strategy for stacking
    if (this.hasExt(Interactive)) {
      const interactive = this.getExt(Interactive);
      interactive.onInteract((entityId: number) => {
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped grenades
        carryable.pickup(
          entityId,
          Carryable.createStackablePickupOptions(carryable, Grenade.DEFAULT_COUNT)
        );
      });
    }
  }

  public getCooldown(): number {
    return Grenade.COOLDOWN;
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

    // Find the grenade in inventory
    const inventoryItems = inventory.getItems();
    const grenadeIndex = inventoryItems.findIndex(
      (item) => item && item.itemType === this.getType()
    );
    if (grenadeIndex === -1) return;

    const grenadeItem = inventoryItems[grenadeIndex];
    if (!grenadeItem) return;

    // Decrement count for stackable grenades
    const currentCount = grenadeItem.state?.count || 1;
    if (currentCount > 1) {
      // Decrement count instead of removing
      inventory.updateItemState(grenadeIndex, { count: currentCount - 1 });
    } else {
      // Remove item if count reaches 0
      inventory.removeItem(grenadeIndex);
    }

    // Set grenade position to player position
    this.getExt(Positionable).setPosition(playerPos);

    // Set velocity based on aim angle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      const dirX = Math.cos(aimAngle);
      const dirY = Math.sin(aimAngle);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(
        dirX * Grenade.THROW_SPEED,
        dirY * Grenade.THROW_SPEED
      );
    } else {
      const directionVector = normalizeDirection(facing);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(directionVector.x, directionVector.y);
      this.velocity.mul(Grenade.THROW_SPEED);
    }

    // Arm the grenade
    this.isArmed = true;

    // Add to world
    this.getEntityManager().addEntity(this);
  }

  private updateGrenade(deltaTime: number): void {
    if (!this.isArmed) return;

    // Update position based on velocity
    const pos = this.getExt(Positionable).getPosition();
    const poolManager = PoolManager.getInstance();
    const velocityScaled = poolManager.vector2.claim(this.velocity.x, this.velocity.y);
    velocityScaled.mul(deltaTime);
    const newPos = pos.clone().add(velocityScaled);
    poolManager.vector2.release(velocityScaled);
    this.getExt(Positionable).setPosition(newPos);

    // Apply friction to slow down
    this.velocity.mul(0.95);

    // Update explosion timer
    this.explosionTimer.update(deltaTime);
    if (this.explosionTimer.isReady()) {
      this.explode();
    }
  }

  private explode(): void {
    if (this.isExploded) return;
    this.isExploded = true;

    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      Grenade.EXPLOSION_RADIUS
    );

    // Damage only enemy group entities (zombies) in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      // Only damage entities in the "enemy" group (zombies)
      // This prevents damage to players (friendly group) and structures (no group)
      if (!entity.hasExt(Groupable) || entity.getExt(Groupable).getGroup() !== "enemy") {
        continue;
      }

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= Grenade.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / Grenade.EXPLOSION_RADIUS;
        const damage = Math.ceil(Grenade.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage);
      }
    }

    // Broadcast explosion event for client to show particle effect
    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the grenade
    this.getEntityManager().markEntityForRemoval(this);
  }
}
