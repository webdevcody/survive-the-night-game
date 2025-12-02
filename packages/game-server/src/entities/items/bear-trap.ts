import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies, getZombieTypesSet } from "../../../../game-shared/src/constants";
import { getConfig } from "@shared/config";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Placeable from "@/extensions/placeable";
import { IEntity } from "@/entities/types";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import Vector2 from "@/util/vector2";
import PoolManager from "@shared/util/pool-manager";
import Updatable from "@/extensions/updatable";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { distance } from "../../../../game-shared/src/util/physics";
import { ItemState } from "@/types/entity";

import { SerializableFields } from "@/util/serializable-fields";

/**
 * A bear trap that snares zombies (and players in Battle Royale) when they step on it
 * The trap can be rearmed after being triggered (by the owner)
 * Trapped players must pick up the trap to free themselves
 */
export class BearTrap extends Entity implements IEntity {
  private static get SIZE(): Vector2 {
    return PoolManager.getInstance().vector2.claim(16, 16);
  }
  private static readonly TRIGGER_RADIUS = getConfig().combat.ITEM_TRIGGER_RADIUS;
  public static readonly DEFAULT_COUNT = 1;
  private triggerExtension: OneTimeTrigger | null = null;
  private interactiveExtension: Interactive;

  constructor(gameManagers: IGameManagers, itemState?: ItemState) {
    super(gameManagers, Entities.BEAR_TRAP);

    // Initialize serializable fields
    this.serialized = new SerializableFields({ isArmed: true, snaredEntityId: null }, () =>
      this.markEntityDirty()
    );

    const count = itemState?.count ?? BearTrap.DEFAULT_COUNT;

    const poolManager = PoolManager.getInstance();
    const size = poolManager.vector2.claim(16, 16);
    this.addExtension(new Positionable(this).setSize(size));
    this.interactiveExtension = new Interactive(this)
      .onInteract((entityId: number) => this.interact(entityId))
      .setDisplayName("bear trap");
    this.addExtension(this.interactiveExtension);
    this.addExtension(new Carryable(this, "bear_trap" as any).setItemState({ count }));
    this.addExtension(new Placeable(this));
    this.addExtension(new Updatable(this, this.updateBearTrap.bind(this)));

    // Activate the trap when created
    this.activate();
  }

  public activate(): void {
    this.setIsArmed(true);
    this.setSnaredEntityId(null);

    // Update display name to show it's armed
    this.interactiveExtension.setDisplayName("bear trap");

    // Remove any existing trigger extension
    if (this.triggerExtension) {
      this.removeExtension(this.triggerExtension);
      this.triggerExtension = null;
    }

    // Add new trigger
    const trigger = new OneTimeTrigger(this, {
      triggerRadius: BearTrap.TRIGGER_RADIUS,
      targetTypes: Zombies,
      includePlayersInBattleRoyale: true, // Allow targeting other players in Battle Royale
    }).onTrigger(() => this.snare());

    this.triggerExtension = trigger;
    this.addExtension(trigger);
  }

  private setIsArmed(value: boolean): void {
    const currentIsArmed = this.serialized.get("isArmed");
    if (currentIsArmed !== value) {
      this.serialized.set("isArmed", value);
    }
  }

  private setSnaredEntityId(id: number | null): void {
    const currentSnaredEntityId = this.serialized.get("snaredEntityId");
    if (currentSnaredEntityId !== id) {
      this.serialized.set("snaredEntityId", id);
    }
  }

  private getSnaredEntityId(): number | null {
    return this.serialized.get("snaredEntityId");
  }

  public updateBearTrap(deltaTime: number) {
    const snaredEntityId = this.getSnaredEntityId();
    // Keep the snared entity's velocity at 0 (backup in case movement strategy tries to override)
    if (snaredEntityId) {
      const snaredEntity = this.getEntityManager().getEntityById(snaredEntityId);
      if (snaredEntity && snaredEntity.hasExt(Movable)) {
        const poolManager = PoolManager.getInstance();
        snaredEntity.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));
      } else {
        // Entity was removed or doesn't exist anymore
        this.setSnaredEntityId(null);
      }
    }
  }

  private snare() {
    if (!this.serialized.get("isArmed")) return;

    const position = this.getExt(Positionable).getCenterPosition();

    // Build target types set - include players in Battle Royale
    const targetTypesSet = getZombieTypesSet();
    const strategy = this.getGameManagers().getGameServer().getGameLoop().getGameModeStrategy();
    if (strategy.getConfig().friendlyFireEnabled) {
      targetTypesSet.add(Entities.PLAYER);
    }

    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      BearTrap.TRIGGER_RADIUS,
      targetTypesSet
    );

    // Get owner ID to exclude
    const ownerId = this.hasExt(Placeable) ? this.getExt(Placeable).getOwnerId() : null;

    // Find the entity that triggered the trap (OneTimeTrigger already verified one exists)
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable) || !entity.hasExt(Movable)) continue;

      // Skip the owner
      if (ownerId !== null && entity.getId() === ownerId) continue;

      // Check if entity is within trigger radius (using center positions for consistency)
      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, entityPos);

      if (dist <= BearTrap.TRIGGER_RADIUS) {
        // Snare the entity - track the snared entity and stop their movement
        this.setSnaredEntityId(entity.getId());
        const poolManager = PoolManager.getInstance();
        entity.getExt(Movable).setVelocity(poolManager.vector2.claim(0, 0));

        // Add Snared extension if not already present
        if (!entity.hasExt(Snared)) {
          entity.addExtension(new Snared(entity));
        }

        // Damage the entity
        if (entity.hasExt(Destructible)) {
          entity.getExt(Destructible).damage(getConfig().trap.BEAR_TRAP_DAMAGE);
        }

        // Disarm the trap
        this.setIsArmed(false);

        // Update display name based on who is trapped
        if (entity.getType() === Entities.PLAYER) {
          this.interactiveExtension.setDisplayName("escape bear trap");
        } else {
          this.interactiveExtension.setDisplayName("rearm bear trap");
        }

        // Remove the trigger extension
        if (this.triggerExtension) {
          this.removeExtension(this.triggerExtension);
          this.triggerExtension = null;
        }

        break;
      }
    }
  }

  private releaseSnaredEntity(): void {
    const snaredEntityId = this.getSnaredEntityId();
    if (snaredEntityId) {
      const snaredEntity = this.getEntityManager().getEntityById(snaredEntityId);
      if (snaredEntity && snaredEntity.hasExt(Snared)) {
        snaredEntity.removeExtension(snaredEntity.getExt(Snared));
      }
      this.setSnaredEntityId(null);
    }
  }

  private interact(entityId: number) {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity || entity.getType() !== Entities.PLAYER) return;

    const snaredEntityId = this.getSnaredEntityId();
    const ownerId = this.hasExt(Placeable) ? this.getExt(Placeable).getOwnerId() : null;
    const isOwner = ownerId !== null && entityId === ownerId;
    const isTrappedPlayer = snaredEntityId !== null && entityId === snaredEntityId;

    const carryable = this.getExt(Carryable);
    const pickupOptions = Carryable.createStackablePickupOptions(carryable, BearTrap.DEFAULT_COUNT);

    // If the interacting player is trapped by this trap, they must pick it up to escape
    if (isTrappedPlayer) {
      this.releaseSnaredEntity();
      carryable.pickup(entityId, pickupOptions);
      return;
    }

    // If trap is disarmed (has caught something)
    if (!this.serialized.get("isArmed")) {
      // Only the owner can rearm the trap (if a zombie is caught, not a player)
      if (isOwner && snaredEntityId !== null) {
        const snaredEntity = this.getEntityManager().getEntityById(snaredEntityId);
        // Only allow rearming if the snared entity is not a player
        if (snaredEntity && snaredEntity.getType() !== Entities.PLAYER) {
          this.releaseSnaredEntity();
          this.activate();
          return;
        }
      }

      // Enemy players (not owner) just pick up the trap, no rearm option
      // Also if owner and no snared entity, just pick it up
      this.releaseSnaredEntity();
      carryable.pickup(entityId, pickupOptions);
      return;
    }

    // If armed, allow pickup
    carryable.pickup(entityId, pickupOptions);
  }
}
