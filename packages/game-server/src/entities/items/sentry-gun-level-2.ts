import Carryable from "@/extensions/carryable";
import Collidable from "@/extensions/collidable";
import Destructible from "@/extensions/destructible";
import Interactive from "@/extensions/interactive";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import Updatable from "@/extensions/updatable";
import { IGameManagers } from "@/managers/types";
import { Zombies } from "@shared/constants";
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
 * A level 2 sentry gun that shoots twice as fast as the base sentry gun.
 */
export class SentryGunLevel2 extends Entity {
  public static get Size(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  public static readonly DEFAULT_COUNT = 1;

  private fireCooldown: Cooldown;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, "sentry_gun_level_2");

    this.fireCooldown = new Cooldown(getConfig().world.SENTRY_GUN_LEVEL_2_FIRE_COOLDOWN / 1000);

    const count = itemState?.count ?? SentryGunLevel2.DEFAULT_COUNT;
    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(new Collidable(this).setSize(size));
    this.addExtension(
      new Interactive(this).onInteract(this.interact.bind(this)).setDisplayName("improved sentry gun")
    );
    this.addExtension(
      new Destructible(this)
        .setMaxHealth(getConfig().world.SENTRY_GUN_LEVEL_2_MAX_HEALTH)
        .setHealth(itemState?.health ?? getConfig().world.SENTRY_GUN_LEVEL_2_MAX_HEALTH)
        .onDeath(() => this.onDeath())
    );
    this.addExtension(
      new Carryable(this, "sentry_gun_level_2").setItemState({
        count,
      })
    );
    this.addExtension(new Placeable(this));
    this.addExtension(new Updatable(this, this.updateSentryGun.bind(this)));
    this.addExtension(new Groupable(this, "friendly"));
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

    let closestZombie: Entity | null = null;
    let closestDistance = Infinity;

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      range
    );

    for (const entity of nearbyEntities) {
      const isZombie = Zombies.includes(entity.getType());
      if (!isZombie) continue;

      if (!entity.hasExt(Destructible)) continue;
      if (entity.getExt(Destructible).isDead()) continue;

      const zombiePos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, zombiePos);

      if (dist <= range && dist < closestDistance) {
        closestDistance = dist;
        closestZombie = entity;
      }
    }

    if (closestZombie) {
      this.shootAt(closestZombie);
      this.fireCooldown.reset();
    }
  }

  private shootAt(target: Entity): void {
    const sentryPosition = this.getExt(Positionable).getCenterPosition();
    const targetPosition = target.getExt(Positionable).getCenterPosition();

    const poolManager = PoolManager.getInstance();
    const direction = poolManager.vector2.claim(
      targetPosition.x - sentryPosition.x,
      targetPosition.y - sentryPosition.y
    );

    const bullet = new Bullet(this.getGameManagers(), getConfig().world.SENTRY_GUN_DAMAGE);
    bullet.setPosition(sentryPosition);
    bullet.setDirectionFromVelocity(direction);
    bullet.setShooterId(this.getId());
    this.getEntityManager().addEntity(bullet);
  }

  private interact(entityId: number): void {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity) return;

    const carryable = this.getExt(Carryable);
    const stackableOptions = Carryable.createStackablePickupOptions(
      carryable,
      SentryGunLevel2.DEFAULT_COUNT
    );

    const originalMergeStrategy = stackableOptions.mergeStrategy!;
    stackableOptions.mergeStrategy = (existing, pickup) => {
      const merged = originalMergeStrategy(existing, pickup);
      return {
        ...merged,
        health: pickup?.health ?? getConfig().world.SENTRY_GUN_LEVEL_2_MAX_HEALTH,
      };
    };

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
