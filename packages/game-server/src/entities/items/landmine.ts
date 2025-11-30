import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies } from "../../../../game-shared/src/constants";
import { getConfig } from "@shared/config";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Placeable from "@/extensions/placeable";
import { distance } from "../../../../game-shared/src/util/physics";
import { IEntity } from "@/entities/types";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import { ItemState } from "@/types/entity";
import { ExplosionEvent } from "../../../../game-shared/src/events/server-sent/events/explosion-event";
import { Cooldown } from "../util/cooldown";
import Updatable from "@/extensions/updatable";

import { SerializableFields } from "@/util/serializable-fields";

/**
 * A landmine that explodes when enemies step on it, damaging all nearby enemies
 */

export class Landmine extends Entity implements IEntity {
  private static get SIZE(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  private static readonly TRIGGER_RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
  public static readonly DEFAULT_COUNT = 1;
  private untilActive: Cooldown;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.LANDMINE);

    // Initialize serializable fields
    this.serialized = new SerializableFields({ isActive: false }, () => this.markEntityDirty());

    this.untilActive = new Cooldown(getConfig().trap.LANDMINE_ACTIVATION_DELAY);

    const count = itemState?.count ?? Landmine.DEFAULT_COUNT;

    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.addExtension(
      new Interactive(this)
        .onInteract((entityId: number) => this.interact(entityId))
        .setDisplayName("landmine")
    );
    this.addExtension(new Carryable(this, "landmine").setItemState({ count }));
    this.addExtension(new Placeable(this));
    this.addExtension(new Updatable(this, this.updateLandmine.bind(this)));
  }

  private setIsActive(value: boolean): void {
    const currentIsActive = this.serialized.get('isActive');
    if (currentIsActive !== value) {
      this.serialized.set('isActive', value);
    }
  }

  public activate(): void {
    this.setIsActive(true);
    this.addExtension(
      new OneTimeTrigger(this, {
        triggerRadius: Landmine.TRIGGER_RADIUS,
        targetTypes: Zombies,
        includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
      }).onTrigger(() => this.explode())
    );
  }

  public updateLandmine(deltaTime: number) {
    this.untilActive.update(deltaTime);
    const isActive = this.serialized.get('isActive');
    if (this.untilActive.isReady() && !isActive) {
      this.activate();
    }
  }

  private explode() {
    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      this.getExt(Positionable).getPosition(),
      getConfig().combat.LANDMINE_EXPLOSION_RADIUS
    );

    // Get owner ID to exclude
    const ownerId = this.hasExt(Placeable) ? this.getExt(Placeable).getOwnerId() : null;

    // Damage all things in explosion radius (except the owner)
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Destructible)) continue;

      // Skip the owner
      if (ownerId !== null && entity.getId() === ownerId) continue;

      const entityPos = entity.getExt(Positionable).getPosition();
      const dist = distance(position, entityPos);

      if (dist <= getConfig().combat.LANDMINE_EXPLOSION_RADIUS) {
        entity.getExt(Destructible).damage(getConfig().trap.LANDMINE_DAMAGE);
      }
    }

    this.getEntityManager().getBroadcaster().broadcastEvent(
      new ExplosionEvent({
        position,
      })
    );

    // Remove the landmine after explosion
    this.getEntityManager().markEntityForRemoval(this);
  }

  private interact(entityId: number) {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity || entity.getType() !== Entities.PLAYER) return;

    const carryable = this.getExt(Carryable);
    // Use helper method to preserve count when picking up dropped landmines
    carryable.pickup(
      entityId,
      Carryable.createStackablePickupOptions(carryable, Landmine.DEFAULT_COUNT)
    );
  }
}
