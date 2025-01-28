import Carryable from "@/extensions/carryable";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import { IGameManagers } from "@/managers/types";
import { Entities } from "@/constants";
import { Entity } from "@/entities/entity";
import Vector2 from "@/util/vector2";
import Consumable from "@/extensions/consumable";
import Destructible from "@/extensions/destructible";
import { Direction } from "@shared/util/direction";
import { Cooldown } from "@/entities/util/cooldown";
import Inventory from "@/extensions/inventory";
import { normalizeDirection } from "@shared/util/direction";
import Updatable from "@/extensions/updatable";
import { ExplosionEvent } from "@/events/server-sent/explosion-event";

export class Grenade extends Entity {
  public static readonly Size = new Vector2(16, 16);
  private static readonly EXPLOSION_RADIUS = 64;
  private static readonly EXPLOSION_DAMAGE = 5;
  private static readonly THROW_SPEED = 130;
  private static readonly EXPLOSION_DELAY = 1;

  private velocity: Vector2 = new Vector2(0, 0);
  private isArmed: boolean = false;
  private explosionTimer: Cooldown;
  private isExploded: boolean = false;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.GRENADE);

    this.explosionTimer = new Cooldown(Grenade.EXPLOSION_DELAY);

    this.extensions = [
      new Positionable(this).setSize(Grenade.Size),
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("grenade"),
      new Carryable(this, "grenade"),
      new Consumable(this).onConsume(this.consume.bind(this)),
      new Updatable(this, this.updateGrenade.bind(this)),
    ];
  }

  private interact(entityId: string): void {
    this.getExt(Carryable).pickup(entityId);
  }

  private consume(entityId: string, idx: number): void {
    const player = this.getEntityManager().getEntityById(entityId);
    if (!player || !player.hasExt(Positionable)) return;

    const playerPos = player.getExt(Positionable).getCenterPosition();
    const input = (player as any).input;
    const facing = input?.facing || Direction.Right;

    // Set grenade position to player position
    this.getExt(Positionable).setPosition(playerPos);

    // Set velocity based on facing direction
    const directionVector = normalizeDirection(facing);
    this.velocity = new Vector2(directionVector.x, directionVector.y).mul(Grenade.THROW_SPEED);

    // Arm the grenade
    this.isArmed = true;

    // Remove from inventory
    const inventory = player.getExt(Inventory);
    inventory.removeItem(idx);

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
