import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "@shared/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import { RawEntity, ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
import { distance } from "@/util/physics";
import { Cooldown } from "../util/cooldown";
import { Bullet } from "@/entities/projectiles/bullet";
import Groupable from "@/extensions/groupable";

/**
 * A sentry gun that automatically targets and shoots at zombies.
 * Has health, can be damaged, and acts like a normal item that can be picked up and moved.
 */
export class SentryGun extends Entity {
  public static readonly Size = new Vector2(16, 16);
  public static readonly DEFAULT_COUNT = 1;

  private fireCooldown: Cooldown;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.SENTRY_GUN);

    this.fireCooldown = new Cooldown(getConfig().world.SENTRY_GUN_FIRE_COOLDOWN / 1000);

    const count = itemState?.count ?? SentryGun.DEFAULT_COUNT;

    this.addExtension(new Positionable(this).setSize(SentryGun.Size));
    this.addExtension(new Collidable(this).setSize(SentryGun.Size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("sentry gun")
    );
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(getConfig().world.SENTRY_GUN_MAX_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.SENTRY_GUN_MAX_HEALTH)
        .onDeath(() => this.onDeath())
    );
    this.addExtension(
      new Carryable(this, "sentry_gun").setItemState({
        count,
      })
    );
    this.addExtension(new Updatable(this, this.updateSentryGun.bind(this)));
    this.addExtension(new Groupable(this, "friendly")); // Allied with player
  }

  private updateSentryGun(deltaTime: number): void {
    this.fireCooldown.update(deltaTime);

    if (this.fireCooldown.isReady()) {
      this.tryShootAtZombie();
    }
  }

  private tryShootAtZombie(): void {
    const position = this.getExt(Positionable).getCenterPosition();
    const range = getConfig().world.SENTRY_GUN_RANGE;

    // Find closest zombie within range
    let closestZombie: Entity | null = null;
    let closestDistance = Infinity;

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      range
    );

    for (const entity of nearbyEntities) {
      // Check if entity is a zombie
      const isZombie = Zombies.includes(entity.getType());
      if (!isZombie) continue;

      // Check if zombie has destructible (is alive)
      if (!entity.hasExt(Destructible)) continue;
      if (entity.getExt(Destructible).isDead()) continue;

      const zombiePos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, zombiePos);

      if (dist <= range && dist < closestDistance) {
        closestDistance = dist;
        closestZombie = entity;
      }
    }

    // Shoot at closest zombie
    if (closestZombie) {
      this.shootAt(closestZombie);
      this.fireCooldown.reset();
    }
  }

  private shootAt(target: Entity): void {
    const sentryPosition = this.getExt(Positionable).getCenterPosition();
    const targetPosition = target.getExt(Positionable).getCenterPosition();

    // Calculate direction to target
    const direction = new Vector2(
      targetPosition.x - sentryPosition.x,
      targetPosition.y - sentryPosition.y
    );

    // Create and fire bullet
    const bullet = new Bullet(this.getGameManagers(), getConfig().world.SENTRY_GUN_DAMAGE);
    bullet.setPosition(sentryPosition);
    bullet.setDirectionFromVelocity(direction);
    bullet.setShooterId(this.getId()); // Set sentry gun as shooter
    this.getEntityManager().addEntity(bullet);
  }

  private interact(entityId: string): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    const stackableOptions = Carryable.createStackablePickupOptions(
      carryable,
      SentryGun.DEFAULT_COUNT
    );

    // Extend merge strategy to also preserve health
    const originalMergeStrategy = stackableOptions.mergeStrategy!;
    stackableOptions.mergeStrategy = (existing, pickup) => {
      const merged = originalMergeStrategy(existing, pickup);
      return {
        ...merged,
        health: pickup?.health ?? getConfig().world.SENTRY_GUN_MAX_HEALTH,
      };
    };

    // Include health in pickup state
    stackableOptions.state = {
      ...stackableOptions.state,
      health: this.getExt(Destructible).getHealth(),
    };

    carryable.pickup(entityId, stackableOptions);
  }

  private onDeath(): void {
    this.getEntityManager().markEntityForRemoval(this);
  }

  public serialize(): RawEntity {
    return {
      ...super.serialize(),
      health: this.getExt(Destructible).getHealth(),
    };
  }
}
