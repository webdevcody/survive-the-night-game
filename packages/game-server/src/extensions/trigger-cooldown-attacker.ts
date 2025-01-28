import { distance } from "../../../game-shared/src/util/physics";
import { Extension, ExtensionSerialized } from "@/extensions/types";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Triggerable from "@/extensions/trigger";
import Destructible from "@/extensions/destructible";
import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import { Rectangle } from "@/util/shape";
import Vector2 from "@/util/vector2";

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

    const positionable = this.self.getExt(Positionable);
    const position = positionable.getCenterPosition();

    for (const entity of entities) {
      if (!entity.hasExt(Destructible)) {
        continue;
      }

      const destructible = entity.getExt(Destructible);
      const entityHitbox = new Rectangle(
        entity.getExt(Positionable).getPosition(),
        new Vector2(16, 16)
      );
      const entityCenter = entityHitbox.center;

      const centerDistance = distance(position, entityCenter);

      if (centerDistance < TriggerCooldownAttacker.RADIUS) {
        if (this.attackCooldown.isReady()) {
          destructible.damage(this.options.damage);
          this.attackCooldown.reset();
          break;
        }
      }
    }
  }

  public serialize(): ExtensionSerialized {
    return {
      type: TriggerCooldownAttacker.type,
      isReady: this.isReady,
    };
  }
}
