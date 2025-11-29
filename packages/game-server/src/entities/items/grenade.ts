import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Destructible from "@/extensions/destructible";
import { Direction } from "@shared/util/direction";
import Inventory from "@/extensions/inventory";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import { ItemState } from "@/types/entity";
import { getConfig } from "@shared/config";
import { calculateProjectileVelocity } from "@/entities/weapons/helpers";
import { distance } from "@/util/physics";

export class Grenade extends Weapon {
  private static readonly EXPLOSION_RADIUS = getConfig().combat.EXPLOSION_RADIUS_MEDIUM;
  private static readonly EXPLOSION_DAMAGE = getConfig().combat.EXPLOSION_DAMAGE_STANDARD;
  private static readonly THROW_SPEED = getConfig().combat.THROW_SPEED;
  private static readonly DEFAULT_THROW_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
  private static readonly COOLDOWN = getConfig().combat.THROWABLE_COOLDOWN;
  public static readonly DEFAULT_COUNT = 1;

  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isArmed: boolean = false;
  private traveledDistance: number = 0;
  private targetDistance: number = Grenade.DEFAULT_THROW_DISTANCE;
  private isExploded: boolean = false;
  private interactiveExtension: Interactive | null = null;
  private throwerId: number = 0;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "grenade");

    // Add Updatable extension for grenade physics after it's thrown
    this.addExtension(new Updatable(this, this.updateGrenade.bind(this)));

    // Make grenades stackable by setting count from itemState or default
    if (this.hasExt(Carryable)) {
      const carryable = this.getExt(Carryable);
      const count = itemState?.count ?? Grenade.DEFAULT_COUNT;
      carryable.setItemState({ count });
    }

    // Store reference to Interactive extension for removal when thrown
    if (this.hasExt(Interactive)) {
      this.interactiveExtension = this.getExt(Interactive);
      this.interactiveExtension.onInteract((entityId: number) => {
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
    _position: { x: number; y: number },
    facing: Direction,
    aimAngle?: number,
    aimDistance?: number
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

    // Set target distance if provided (mouse aiming), grenade will explode at crosshair position
    if (aimDistance !== undefined && !isNaN(aimDistance)) {
      this.targetDistance = aimDistance;
    } else {
      this.targetDistance = Grenade.DEFAULT_THROW_DISTANCE;
    }

    // Set velocity using shared utility function
    this.velocity = calculateProjectileVelocity(facing, Grenade.THROW_SPEED, aimAngle);

    // Arm the grenade
    this.isArmed = true;
    this.traveledDistance = 0;
    this.throwerId = playerId;

    // Remove Interactive extension - once thrown, grenades are "live" and cannot be picked up
    if (this.interactiveExtension) {
      this.removeExtension(this.interactiveExtension);
      this.interactiveExtension = null;
    }

    // Add to world
    this.getEntityManager().addEntity(this);
  }

  private updateGrenade(deltaTime: number): void {
    if (!this.isArmed) return;

    const poolManager = PoolManager.getInstance();
    const positionable = this.getExt(Positionable);
    const lastPosition = positionable.getPosition().clone();

    // Update position based on velocity (no friction - travels at constant speed like grenade launcher)
    const newPos = poolManager.vector2.claim(
      lastPosition.x + this.velocity.x * deltaTime,
      lastPosition.y + this.velocity.y * deltaTime
    );
    positionable.setPosition(newPos);

    // Check if grenade has reached target distance
    this.traveledDistance += distance(lastPosition, newPos);
    if (this.traveledDistance >= this.targetDistance) {
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

    // Use game mode strategy to determine valid targets
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();

    // Damage valid targets in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      // Use strategy to determine if this entity should be damaged
      if (!strategy.shouldDamageTarget(this, entity, this.throwerId)) {
        continue;
      }

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= Grenade.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / Grenade.EXPLOSION_RADIUS;
        const damage = Math.ceil(Grenade.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage, this.throwerId);
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
