import { Extension, ExtensionSerialized } from "@/extensions/types";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";

/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
export default class TriggerCooldownAttacker implements Extension {
  public static readonly type = "trigger-cooldown-attacker";
  private static readonly RADIUS = 16;
  private static readonly RADIUS_SQUARED =
    TriggerCooldownAttacker.RADIUS * TriggerCooldownAttacker.RADIUS;

  private self: IEntity;
  private attackCooldown: Cooldown;
  private options: {
    damage: number;
    victimType: EntityType;
    cooldown: number;
  };

  // SERIALIZED PROPERTIES
  public isReady: boolean; // used to change spike view
  private dirty: boolean = false;

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

    const wasReady = this.isReady;
    this.isReady = this.attackCooldown.isReady();
    if (wasReady !== this.isReady) {
      this.markDirty(); // Mark dirty when ready state changes
    }

    // Early exit: skip expensive spatial query if cooldown isn't ready
    if (!this.attackCooldown.isReady()) {
      return;
    }

    const positionable = this.self.getExt(Positionable);
    const position = positionable.getCenterPosition();

    // Use RADIUS instead of hardcoded 100 to avoid querying unnecessary entities
    // Add small buffer (2) to account for entity size when querying spatial grid
    const queryRadius = TriggerCooldownAttacker.RADIUS + 2;
    const victimTypeSet = new Set<EntityType>([this.options.victimType]);
    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getPosition(), queryRadius, victimTypeSet);

    for (const entity of entities) {
      if (!entity.hasExt(Destructible)) {
        continue;
      }

      const destructible = entity.getExt(Destructible);
      const entityCenter = entity.getExt(Positionable).getCenterPosition();

      // Use squared distance comparison to avoid expensive sqrt calculation
      const dx = position.x - entityCenter.x;
      const dy = position.y - entityCenter.y;
      const centerDistanceSquared = dx * dx + dy * dy;

      if (centerDistanceSquared < TriggerCooldownAttacker.RADIUS_SQUARED) {
        destructible.damage(this.options.damage);
        this.attackCooldown.reset();
        break;
      }
    }
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: TriggerCooldownAttacker.type,
      isReady: this.isReady,
    };
  }
}
