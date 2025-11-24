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
import { Entities } from "@/constants";

export class MolotovCocktail extends Weapon {
  private static readonly EXPLOSION_RADIUS = 64;
  private static readonly EXPLOSION_DAMAGE = 3;
  private static readonly THROW_SPEED = 130;
  private static readonly EXPLOSION_DELAY = 1;
  private static readonly COOLDOWN = 0.5;
  public static readonly DEFAULT_COUNT = 1;
  private static readonly FIRE_COUNT = 8; // Number of fire entities to spawn
  private static readonly FIRE_SPREAD_RADIUS = 48; // Radius to spread fires

  private velocity: Vector2 = PoolManager.getInstance().vector2.claim(0, 0);
  private isArmed: boolean = false;
  private explosionTimer: Cooldown;
  private isExploded: boolean = false;
  private interactiveExtension: Interactive | null = null;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "molotov_cocktail");

    this.explosionTimer = new Cooldown(MolotovCocktail.EXPLOSION_DELAY);

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
    position: { x: number; y: number },
    facing: Direction,
    aimAngle?: number
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

    // Set velocity based on aim angle if provided (mouse aiming), otherwise use facing direction
    if (aimAngle !== undefined) {
      const dirX = Math.cos(aimAngle);
      const dirY = Math.sin(aimAngle);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(
        dirX * MolotovCocktail.THROW_SPEED,
        dirY * MolotovCocktail.THROW_SPEED
      );
    } else {
      const directionVector = normalizeDirection(facing);
      const poolManager = PoolManager.getInstance();
      this.velocity = poolManager.vector2.claim(directionVector.x, directionVector.y);
      this.velocity.mul(MolotovCocktail.THROW_SPEED);
    }

    // Arm the molotov
    this.isArmed = true;

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
      MolotovCocktail.EXPLOSION_RADIUS
    );

    // Damage all destructible entities in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = position.distance(entityPos);

      if (dist <= MolotovCocktail.EXPLOSION_RADIUS) {
        // Scale damage based on distance from explosion
        const damageScale = 1 - dist / MolotovCocktail.EXPLOSION_RADIUS;
        const damage = Math.ceil(MolotovCocktail.EXPLOSION_DAMAGE * damageScale);
        entity.getExt(Destructible).damage(damage);
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
