import { Extension } from "@/extensions/types";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Destructible from "@/extensions/destructible";
import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
export default class TriggerCooldownAttacker implements Extension {
  public static readonly type = "trigger-cooldown-attacker";
  private static readonly RADIUS = 16;
  private static readonly RADIUS_SQUARED =
    TriggerCooldownAttacker.RADIUS * TriggerCooldownAttacker.RADIUS;
  private static readonly CHECK_INTERVAL = 0.5; // Check for enemies every half second

  private self: IEntity;
  private attackCooldown: Cooldown;
  private checkCooldown: Cooldown;
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
    this.checkCooldown = new Cooldown(TriggerCooldownAttacker.CHECK_INTERVAL);
    // Set random offset to spread checks across time
    this.checkCooldown.setTimeRemaining(Math.random() * TriggerCooldownAttacker.CHECK_INTERVAL);
    this.isReady = true;
    this.options = options;
  }

  public update(deltaTime: number) {
    this.attackCooldown.update(deltaTime);
    this.checkCooldown.update(deltaTime);

    const wasReady = this.isReady;
    this.isReady = this.attackCooldown.isReady();
    if (wasReady !== this.isReady) {
      this.markDirty(); // Mark dirty when ready state changes
    }

    // Early exit: skip expensive spatial query if attack cooldown isn't ready
    if (!this.attackCooldown.isReady()) {
      return;
    }

    // Only check for enemies every half second
    if (!this.checkCooldown.isReady()) {
      return;
    }

    // Reset check cooldown
    this.checkCooldown.reset();

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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt8(encodeExtensionType(TriggerCooldownAttacker.type));
    writer.writeBoolean(this.isReady);
  }
}
