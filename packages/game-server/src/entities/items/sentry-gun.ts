import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "@shared/constants";
import { getConfig } from "@shared/config";
import { Entity } from "@/entities/entity";
import { ItemState } from "@/types/entity";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { distance } from "@/util/physics";
import { Cooldown } from "../util/cooldown";
import { Bullet } from "@/entities/projectiles/bullet";
import Groupable from "@/extensions/groupable";

/**
 * A sentry gun that automatically targets and shoots at zombies.
 * Has health, can be damaged, and acts like a normal item that can be picked up and moved.
 */
export class SentryGun extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  private fireCooldown: Cooldown;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.SENTRY_GUN);

    this.fireCooldown = new Cooldown(getConfig().world.SENTRY_GUN_FIRE_COOLDOWN / 1000);

    const count = itemState?.count ?? SentryGun.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
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
    this.addExtension(new Placeable(this));
    this.addExtension(new Updatable(this, this.updateSentryGun.bind(this)));
    this.addExtension(new Groupable(this, "friendly")); // Allied with player
  }

  private updateSentryGun(deltaTime: number): void {
    this.fireCooldown.update(deltaTime);

    if (this.fireCooldown.isReady()) {
      this.tryShootAtTarget();
    }
  }

  private tryShootAtTarget(): void {
    const position = this.getExt(Positionable).getCenterPosition();
    const range = getConfig().world.SENTRY_GUN_RANGE;

    // Check if we should include players (Battle Royale friendly fire)
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    const includePlayersAsFoes = strategy.getConfig().friendlyFireEnabled;

    // Get owner ID to exclude
    const ownerId = this.hasExt(Placeable) ? this.getExt(Placeable).getOwnerId() : null;

    // Find closest target within range
    let closestTarget: Entity | null = null;
    let closestDistance = Infinity;

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      range
    );

    for (const entity of nearbyEntities) {
      // Check if entity is a valid target
      const isZombie = Zombies.includes(entity.getType());
      const isPlayer = entity.getType() === Entities.PLAYER;

      // Skip if not a zombie and not a player (or players aren't valid targets)
      if (!isZombie && !(isPlayer && includePlayersAsFoes)) continue;

      // Skip the owner (never target the player who placed this)
      if (ownerId !== null && entity.getId() === ownerId) continue;

      // Check if entity has destructible (is alive)
      if (!entity.hasExt(Destructible)) continue;
      if (entity.getExt(Destructible).isDead()) continue;

      const targetPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, targetPos);

      if (dist <= range && dist < closestDistance) {
        closestDistance = dist;
        closestTarget = entity;
      }
    }

    // Shoot at closest target
    if (closestTarget) {
      this.shootAt(closestTarget);
      this.fireCooldown.reset();
    }
  }

  private shootAt(target: Entity): void {
    const sentryPosition = this.getExt(Positionable).getCenterPosition();
    const targetPosition = target.getExt(Positionable).getCenterPosition();

    // Calculate direction to target
    const poolManager = PoolManager.getInstance();
    const direction = poolManager.vector2.claim(
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

  private interact(entityId: number): void {
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

}
