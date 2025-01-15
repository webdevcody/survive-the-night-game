import { distance } from "../physics";
import { Extension, ExtensionSerialized } from "./types";
import { Rectangle } from "../geom/rectangle";
import { Cooldown } from "../entities/util/cooldown";
import Positionable from "./positionable";
import Triggerable from "./trigger";
import Destructible from "./destructible";
import { EntityType } from "@survive-the-night/game-shared/src/types/entity";
import { IEntity } from "../types";

/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
export default class TriggerCooldownAttacker implements Extension {
  public static readonly type = "trigger-cooldown-attacker";
  private static readonly RADIUS = 16;

  private self: IEntity;
  private attackCooldown: Cooldown;
  private options: {
    damage: number;
    victimType: EntityType;
    cooldown: number;
  };

  // SERIALIZED PROPERTIES
  public isReady: boolean; // used to change spike view

  public constructor(
    self: IEntity,
    options: {
      damage: number;
      victimType: EntityType;
      cooldown: number;
    }
  ) {
    this.self = self;
    this.attackCooldown = new Cooldown(options.cooldown, true);
    this.isReady = true;
    this.options = options;
  }

  public update(deltaTime: number) {
    this.attackCooldown.update(deltaTime);

    this.isReady = this.attackCooldown.isReady();

    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(this.self.getExt(Positionable).getPosition(), 100, [
        this.options.victimType,
      ]);

    const triggerBox = this.self.getExt(Triggerable).getTriggerBox();
    const triggerCenter = triggerBox.getCenter();

    for (const entity of entities) {
      if (!entity.hasExt(Destructible)) {
        continue;
      }

      const destructible = entity.getExt(Destructible);
      const entityHitbox = new Rectangle(
        entity.getExt(Positionable).getPosition().x,
        entity.getExt(Positionable).getPosition().y,
        16,
        16
      );
      const entityCenter = entityHitbox.getCenter();

      const centerDistance = distance(triggerCenter, entityCenter);

      if (centerDistance < TriggerCooldownAttacker.RADIUS) {
        if (this.attackCooldown.isReady()) {
          destructible.damage(this.options.damage);
          this.attackCooldown.reset();
          break;
        }
      }
    }
  }

  public deserialize(data: ExtensionSerialized): this {
    this.isReady = data.isReady;
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: TriggerCooldownAttacker.type,
      isReady: this.isReady,
    };
  }
}
