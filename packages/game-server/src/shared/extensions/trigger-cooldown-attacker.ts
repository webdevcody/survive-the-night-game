import { Triggerable } from ".";
import { distance } from "../physics";
import { Positionable } from "./index";
import { EntityType, GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";
import { Zombie } from "../entities/zombie";
import { Rectangle } from "../geom/rectangle";
import { Cooldown } from "../entities/util/cooldown";
import { EntityManager } from "@/managers/entity-manager";

/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
export default class TriggerCooldownAttacker implements Extension {
  public static readonly Name = ExtensionNames.triggerCooldownAttacker;
  private static readonly RADIUS = 16;

  private self: GenericEntity;
  private entityManager: EntityManager;
  private attackCooldown: Cooldown;
  private options: {
    damage: number;
    victimType: EntityType;
    cooldown: number;
  };

  // SERIALIZED PROPERTIES
  public isReady: boolean; // used to change spike view

  public constructor(
    self: GenericEntity,
    entityManager: EntityManager,
    options: {
      damage: number;
      victimType: EntityType;
      cooldown: number;
    }
  ) {
    this.self = self;
    this.entityManager = entityManager;
    this.attackCooldown = new Cooldown(options.cooldown, true);
    this.isReady = true;
    this.options = options;
  }

  public update(deltaTime: number) {
    this.attackCooldown.update(deltaTime);

    this.isReady = this.attackCooldown.isReady();

    const entities = this.entityManager.getNearbyEntities(
      this.self.getExt(Positionable).getPosition(),
      100,
      [this.options.victimType]
    ) as Zombie[];

    const triggerBox = this.self.getExt(Triggerable).getTriggerBox();
    const triggerCenter = triggerBox.getCenter();

    for (const entity of entities) {
      const entityHitbox = new Rectangle(entity.getHitbox().x, entity.getHitbox().y, 16, 16);
      const entityCenter = entityHitbox.getCenter();

      const centerDistance = distance(triggerCenter, entityCenter);

      if (centerDistance < TriggerCooldownAttacker.RADIUS) {
        if (this.attackCooldown.isReady()) {
          entity.damage(this.options.damage);
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
      name: TriggerCooldownAttacker.Name,
      isReady: this.isReady,
    };
  }
}
