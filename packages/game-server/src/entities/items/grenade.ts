import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import Vector2 from "@/util/vector2";
import Destructible from "@/extensions/destructible";
import { Direction } from "@shared/util/direction";
import { Cooldown } from "@/entities/util/cooldown";
import Inventory from "@/extensions/inventory";
import { normalizeDirection } from "@shared/util/direction";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";
import { Weapon } from "@/entities/weapons/weapon";
import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";

export class Grenade extends Weapon {
  private static readonly EXPLOSION_RADIUS = 64;
  private static readonly EXPLOSION_DAMAGE = 5;
  private static readonly THROW_SPEED = 130;
  private static readonly EXPLOSION_DELAY = 1;
  private static readonly COOLDOWN = 0.5;
  private static readonly DEFAULT_COUNT = 1;

  private velocity: Vector2 = new Vector2(0, 0);
  private isArmed: boolean = false;
  private explosionTimer: Cooldown;
  private isExploded: boolean = false;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, "grenade");

    this.explosionTimer = new Cooldown(Grenade.EXPLOSION_DELAY);

    // Add Updatable extension for grenade physics after it's thrown
    this.extensions.push(new Updatable(this, this.updateGrenade.bind(this)));

    // Make grenades stackable by setting default count
    const carryable = this.extensions.find((ext) => ext instanceof Carryable) as Carryable;
    if (carryable) {
      carryable.setItemState({ count: Grenade.DEFAULT_COUNT });
    }

    // Override Interactive callback to use merge strategy for stacking
    const interactive = this.extensions.find((ext) => ext instanceof Interactive) as Interactive;
    if (interactive) {
      interactive.onInteract((entityId: string) => {
        const carryable = this.getExt(Carryable);
        // Use merge strategy to stack grenades
        carryable.pickup(entityId, {
          state: { count: Grenade.DEFAULT_COUNT },
          mergeStrategy: (existing, pickup) => ({
            count: (existing?.count || 0) + (pickup?.count || Grenade.DEFAULT_COUNT),
          }),
        });
      });
    }
  }

  public getCooldown(): number {
    return Grenade.COOLDOWN;
  }

  public attack(
    playerId: string,
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
    const grenadeIndex = inventoryItems.findIndex((item) => item && item.itemType === "grenade");
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
      this.velocity = new Vector2(dirX * Grenade.THROW_SPEED, dirY * Grenade.THROW_SPEED);
    } else {
      const directionVector = normalizeDirection(facing);
      this.velocity = new Vector2(directionVector.x, directionVector.y).mul(Grenade.THROW_SPEED);
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
    const newPos = pos.add(this.velocity.mul(deltaTime));
    this.getExt(Positionable).setPosition(newPos);

    // Apply friction to slow down
    this.velocity = this.velocity.mul(0.95);

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

    // Damage all destructible entities in explosion radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

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
