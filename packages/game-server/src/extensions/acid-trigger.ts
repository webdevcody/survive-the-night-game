import { Extension } from "@/extensions/types";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import Poison from "./poison";
import { Entities } from "@shared/constants";
import { getConfig } from "@shared/config";
import { Player } from "@/entities/players/player";

/**
 * Extension that triggers when a player walks over acid, adding poison extension
 * Similar to TriggerCooldownAttacker but adds poison instead of dealing damage
 */
type AcidTriggerFields = {
  isReady: boolean;
};

export default class AcidTrigger extends ExtensionBase<AcidTriggerFields> {
  public static readonly type = "acid-trigger";
  private static readonly RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
  private static readonly RADIUS_SQUARED = AcidTrigger.RADIUS * AcidTrigger.RADIUS;
  private static readonly CHECK_INTERVAL = 0.2; // Check for players every half second

  private triggerCooldown: Cooldown;
  private checkCooldown: Cooldown;
  private poisonMaxDamage: number;
  private poisonDamagePerTick: number;
  private poisonDamageInterval: number;

  public constructor(
    self: IEntity,
    options: {
      triggerCooldown: number;
      poisonMaxDamage?: number;
      poisonDamagePerTick?: number;
      poisonDamageInterval?: number;
    }
  ) {
    super(self, { isReady: true });
    this.triggerCooldown = new Cooldown(options.triggerCooldown, true);
    this.checkCooldown = new Cooldown(AcidTrigger.CHECK_INTERVAL);
    // Set random offset to spread checks across time
    this.checkCooldown.setTimeRemaining(Math.random() * AcidTrigger.CHECK_INTERVAL);
    this.poisonMaxDamage = options.poisonMaxDamage ?? 3;
    this.poisonDamagePerTick = options.poisonDamagePerTick ?? 1;
    this.poisonDamageInterval = options.poisonDamageInterval ?? 1;
  }

  public getIsReady(): boolean {
    return this.serialized.get("isReady");
  }

  public update(deltaTime: number) {
    this.triggerCooldown.update(deltaTime);
    this.checkCooldown.update(deltaTime);

    // Only update serialized if value actually changed to avoid unnecessary dirty marking
    const newIsReady = this.triggerCooldown.isReady();
    const currentIsReady = this.serialized.get("isReady");
    if (currentIsReady !== newIsReady) {
      this.serialized.set("isReady", newIsReady);
    }

    // Early exit: skip expensive spatial query if trigger cooldown isn't ready
    if (!this.triggerCooldown.isReady()) {
      return;
    }

    // Only check for players every half second
    if (!this.checkCooldown.isReady()) {
      return;
    }

    // Reset check cooldown
    this.checkCooldown.reset();

    const positionable = this.self.getExt(Positionable);
    const position = positionable.getCenterPosition();

    // Use RADIUS instead of hardcoded 100 to avoid querying unnecessary entities
    // Add small buffer (2) to account for entity size when querying spatial grid
    const queryRadius = AcidTrigger.RADIUS + 2;
    const playerTypeSet = new Set<EntityType>([Entities.PLAYER]);
    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getPosition(), queryRadius, playerTypeSet);

    for (const entity of entities) {
      if (!entity.hasExt(Positionable)) {
        continue;
      }

      // Skip zombie players - acid only affects human players
      if (entity instanceof Player && entity.isZombie()) {
        continue;
      }

      const entityCenter = entity.getExt(Positionable).getCenterPosition();

      // Use squared distance comparison to avoid expensive sqrt calculation
      const dx = position.x - entityCenter.x;
      const dy = position.y - entityCenter.y;
      const centerDistanceSquared = dx * dx + dy * dy;

      if (centerDistanceSquared < AcidTrigger.RADIUS_SQUARED) {
        // Add poison extension if player doesn't already have it
        if (!entity.hasExt(Poison)) {
          entity.addExtension(
            new Poison(
              entity,
              this.poisonMaxDamage,
              this.poisonDamagePerTick,
              this.poisonDamageInterval
            )
          );
        }
        this.triggerCooldown.reset();
        break;
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(AcidTrigger.type));
    writer.writeBoolean(this.serialized.get("isReady"));
  }
}
