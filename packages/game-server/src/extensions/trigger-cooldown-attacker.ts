import { Extension } from "@/extensions/types";
import { Cooldown } from "@/entities/util/cooldown";
import Positionable from "@/extensions/positionable";
import Placeable from "@/extensions/placeable";
import Destructible from "@/extensions/destructible";
import { EntityType } from "@/types/entity";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";
import { getConfig } from "@shared/config";
import { Entities } from "@shared/constants";

/**
 * This extension will cause the entity to fire an attack when the cooldown is ready.
 * You can pass in the type of victim you should attack.
 */
type TriggerCooldownAttackerFields = {
  isReady: boolean;
};

interface TriggerCooldownAttackerOptions {
  damage: number;
  victimType: EntityType;
  cooldown: number;
  /** If true, include players in target types based on game mode (for Battle Royale friendly fire) */
  includePlayersInBattleRoyale?: boolean;
}

export default class TriggerCooldownAttacker extends ExtensionBase<TriggerCooldownAttackerFields> {
  public static readonly type = "trigger-cooldown-attacker";
  private static readonly RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
  private static readonly RADIUS_SQUARED =
    TriggerCooldownAttacker.RADIUS * TriggerCooldownAttacker.RADIUS;
  private static readonly CHECK_INTERVAL = getConfig().entity.PLAYER_CHECK_INTERVAL;

  private attackCooldown: Cooldown;
  private checkCooldown: Cooldown;
  private options: TriggerCooldownAttackerOptions;

  public constructor(self: IEntity, options: TriggerCooldownAttackerOptions) {
    super(self, { isReady: true });
    this.attackCooldown = new Cooldown(options.cooldown, true);
    this.checkCooldown = new Cooldown(TriggerCooldownAttacker.CHECK_INTERVAL);
    // Set random offset to spread checks across time
    this.checkCooldown.setTimeRemaining(Math.random() * TriggerCooldownAttacker.CHECK_INTERVAL);
    this.options = options;
  }

  public getIsReady(): boolean {
    return this.serialized.get('isReady');
  }

  public update(deltaTime: number) {
    this.attackCooldown.update(deltaTime);
    this.checkCooldown.update(deltaTime);

    // Only update serialized if value actually changed to avoid unnecessary dirty marking
    const newIsReady = this.attackCooldown.isReady();
    const currentIsReady = this.serialized.get('isReady');
    if (currentIsReady !== newIsReady) {
      this.serialized.set('isReady', newIsReady);
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

    // Check if we should include players based on game mode (Battle Royale friendly fire)
    if (this.options.includePlayersInBattleRoyale) {
      const strategy = this.self.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
      if (strategy.getConfig().friendlyFireEnabled) {
        victimTypeSet.add(Entities.PLAYER);
      }
    }

    const entities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getPosition(), queryRadius, victimTypeSet);

    // Get owner ID to exclude from targeting
    const ownerId = this.self.hasExt(Placeable) ? this.self.getExt(Placeable).getOwnerId() : null;

    for (const entity of entities) {
      if (!entity.hasExt(Destructible)) {
        continue;
      }

      // Skip the owner (never damage the player who placed this)
      if (ownerId !== null && entity.getId() === ownerId) continue;

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

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(TriggerCooldownAttacker.type));
    writer.writeBoolean(this.serialized.get('isReady'));
  }
}
