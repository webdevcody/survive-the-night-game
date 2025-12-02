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
import { Entities } from "@/constants";
import { getConfig } from "@shared/config";
import { calculateProjectileVelocity } from "@/entities/weapons/helpers";
import { distance } from "@/util/physics";

export class MolotovCocktail extends Weapon {
  private static readonly EXPLOSION_RADIUS = getConfig().combat.EXPLOSION_RADIUS_MEDIUM;
  private static readonly EXPLOSION_DAMAGE = 3;
  private static readonly THROW_SPEED = getConfig().combat.THROW_SPEED;
  private static readonly DEFAULT_THROW_DISTANCE = getConfig().combat.TRAVEL_DISTANCE_MEDIUM;
  private static readonly COOLDOWN = getConfig().combat.THROWABLE_COOLDOWN;
  public static readonly DEFAULT_COUNT = 1;
  private static readonly FIRE_COUNT = getConfig().combat.MOLOTOV_FIRE_COUNT;
  private static readonly FIRE_SPREAD_RADIUS = getConfig().combat.MOLOTOV_FIRE_SPREAD_RADIUS;

  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isArmed: boolean = false;
  private traveledDistance: number = 0;
  private targetDistance: number = MolotovCocktail.DEFAULT_THROW_DISTANCE;
  private isExploded: boolean = false;
  private interactiveExtension: Interactive | null = null;
  private throwerId: number = 0;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "molotov_cocktail");

    // Add Updatable extension for molotov physics after it's thrown
    this.addExtension(new Updatable(this, this.updateMolotov.bind(this)));

    // Make molotovs stackable by setting count from itemState or default
    if (this.hasExt(Carryable)) {
      const carryable = this.getExt(Carryable);
      const count = itemState?.count ?? MolotovCocktail.DEFAULT_COUNT;
      carryable.setItemState({ count });
    }

    // Store reference to Interactive extension for removal when thrown
    if (this.hasExt(Interactive)) {
      this.interactiveExtension = this.getExt(Interactive);
      this.interactiveExtension.onInteract((entityId: number) => {
        const carryable = this.getExt(Carryable);
        // Use helper method to preserve count when picking up dropped molotovs
        carryable.pickup(
          entityId,
          Carryable.createStackablePickupOptions(carryable, MolotovCocktail.DEFAULT_COUNT)
        );
      });
    }
  }

  public getCooldown(): number {
    return MolotovCocktail.COOLDOWN;
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

    // Find the molotov in inventory
    const inventoryItems = inventory.getItems();
    const molotovIndex = inventoryItems.findIndex(
      (item) => item && item.itemType === this.getType()
    );
    if (molotovIndex === -1) return;

    const molotovItem = inventoryItems[molotovIndex];
    if (!molotovItem) return;

    // Decrement count for stackable molotovs
    const currentCount = molotovItem.state?.count || 1;
    if (currentCount > 1) {
      // Decrement count instead of removing
      inventory.updateItemState(molotovIndex, { count: currentCount - 1 });
    } else {
      // Remove item if count reaches 0
      inventory.removeItem(molotovIndex);
    }

    // Set molotov position to player position
    this.getExt(Positionable).setPosition(playerPos);

    // Set target distance if provided (mouse aiming), molotov will explode at crosshair position
    if (aimDistance !== undefined && !isNaN(aimDistance)) {
      this.targetDistance = aimDistance;
    } else {
      this.targetDistance = MolotovCocktail.DEFAULT_THROW_DISTANCE;
    }

    // Set velocity using shared utility function
    this.velocity = calculateProjectileVelocity(facing, MolotovCocktail.THROW_SPEED, aimAngle);

    // Arm the molotov
    this.isArmed = true;
    this.traveledDistance = 0;
    this.throwerId = playerId;

    // Remove Interactive extension - once thrown, molotovs are "live" and cannot be picked up
    if (this.interactiveExtension) {
      this.removeExtension(this.interactiveExtension);
      this.interactiveExtension = null;
    }

    // Add to world
    this.getEntityManager().addEntity(this);
  }

  private updateMolotov(deltaTime: number): void {
    if (!this.isArmed) return;

    const poolManager = PoolManager.getInstance();
    const positionable = this.getExt(Positionable);
    const lastPosition = positionable.getPosition().clone();

    // Update position based on velocity (no friction - travels at constant speed like grenade)
    const newPos = poolManager.vector2.claim(
      lastPosition.x + this.velocity.x * deltaTime,
      lastPosition.y + this.velocity.y * deltaTime
    );
    positionable.setPosition(newPos);

    // Check if molotov has reached target distance
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
      MolotovCocktail.EXPLOSION_RADIUS
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
      const dist = distance(position, entityPos);

      if (dist <= MolotovCocktail.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / MolotovCocktail.EXPLOSION_RADIUS;
        const damage = Math.ceil(MolotovCocktail.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage, this.throwerId);
      }
    }

    // Spawn fire entities in a spread pattern
    this.spawnFires(position);

    // Broadcast explosion event for client to show particle effect
    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the molotov
    this.getEntityManager().markEntityForRemoval(this);
  }

  private spawnFires(centerPosition: Vector2): void {
    const poolManager = PoolManager.getInstance();
    const entityManager = this.getEntityManager();

    for (let i = 0; i < MolotovCocktail.FIRE_COUNT; i++) {
      // Create random position within spread radius
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * MolotovCocktail.FIRE_SPREAD_RADIUS;
      const firePosition = poolManager.vector2.claim(
        centerPosition.x + Math.cos(angle) * distance,
        centerPosition.y + Math.sin(angle) * distance
      );

      // Create fire entity
      const fire = entityManager.createEntity(Entities.FIRE);
      if (fire) {
        fire.getExt(Positionable).setPosition(firePosition);
        entityManager.addEntity(fire);
      }

      poolManager.vector2.release(firePosition);
    }
  }
}
