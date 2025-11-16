import { Entity } from "@/entities/entity";
import { IGameManagers } from "@/managers/types";
import { Entities, Zombies, getZombieTypesSet } from "../../../../game-shared/src/constants";
import Positionable from "@/extensions/positionable";
import Interactive from "@/extensions/interactive";
import Carryable from "@/extensions/carryable";
import Placeable from "@/extensions/placeable";
import { IEntity } from "@/entities/types";
import Destructible from "@/extensions/destructible";
import OneTimeTrigger from "@/extensions/one-time-trigger";
import Vector2 from "@/util/vector2";
import Updatable from "@/extensions/updatable";
import Movable from "@/extensions/movable";
import Snared from "@/extensions/snared";
import { distance } from "../../../../game-shared/src/util/physics";

/**
 * A bear trap that snares zombies when they step on it, preventing them from moving
 * The trap can be rearmed after being triggered
 */
const BEAR_TRAP_SERIALIZABLE_FIELDS = ["isArmed", "snaredZombieId"] as const;

export class BearTrap extends Entity<typeof BEAR_TRAP_SERIALIZABLE_FIELDS> implements IEntity {
  protected serializableFields = BEAR_TRAP_SERIALIZABLE_FIELDS;
  private static readonly SIZE = new Vector2(16, 16);
  private static readonly DAMAGE = 1;
  private static readonly TRIGGER_RADIUS = 16;
  private isArmed = true;
  private snaredZombieId: string | null = null;
  private triggerExtension: OneTimeTrigger | null = null;
  private interactiveExtension: Interactive;

  constructor(gameManagers: IGameManagers) {
    super(gameManagers, Entities.BEAR_TRAP);

    this.addExtension(new Positionable(this).setSize(BearTrap.SIZE));
    this.interactiveExtension = new Interactive(this)
      .onInteract((entityId: string) => this.interact(entityId))
      .setDisplayName("bear trap");
    this.addExtension(this.interactiveExtension);
    this.addExtension(new Carryable(this, "bear_trap" as any));
    this.addExtension(new Placeable(this));
    this.addExtension(new Updatable(this, this.updateBearTrap.bind(this)));

    // Activate the trap when created
    this.activate();
  }

  public activate(): void {
    this.setIsArmed(true);
    this.setSnaredZombieId(null);

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
    }).onTrigger(() => this.snare());

    this.triggerExtension = trigger;
    this.addExtension(trigger);
  }

  private setIsArmed(value: boolean): void {
    if (this.isArmed !== value) {
      this.isArmed = value;
      this.markFieldDirty("isArmed");
    }
  }

  private setSnaredZombieId(id: string | null): void {
    if (this.snaredZombieId !== id) {
      this.snaredZombieId = id;
      this.markFieldDirty("snaredZombieId");
    }
  }

  public updateBearTrap(deltaTime: number) {
    // Keep the snared zombie's velocity at 0 (backup in case movement strategy tries to override)
    if (this.snaredZombieId) {
      const zombie = this.getEntityManager().getEntityById(this.snaredZombieId);
      if (zombie && zombie.hasExt(Movable)) {
        zombie.getExt(Movable).setVelocity(new Vector2(0, 0));
      } else {
        // Zombie was removed or doesn't exist anymore
        this.setSnaredZombieId(null);
      }
    }
  }

  private snare() {
    if (!this.isArmed) return;

    const position = this.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.getEntityManager().getNearbyEntities(
      position,
      BearTrap.TRIGGER_RADIUS,
      getZombieTypesSet()
    );

    // Find the zombie that triggered the trap (OneTimeTrigger already verified one exists)
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable) || !entity.hasExt(Movable)) continue;

      // Check if zombie is within trigger radius (using center positions for consistency)
      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, entityPos);

      if (dist <= BearTrap.TRIGGER_RADIUS) {
        // Snare the zombie - add Snared extension to prevent movement
        this.setSnaredZombieId(entity.getId());
        entity.getExt(Movable).setVelocity(new Vector2(0, 0));

        // Add Snared extension if not already present
        if (!entity.hasExt(Snared)) {
          entity.addExtension(new Snared(entity));
        }

        // Damage the zombie
        if (entity.hasExt(Destructible)) {
          entity.getExt(Destructible).damage(BearTrap.DAMAGE);
        }

        // Disarm the trap
        this.setIsArmed(false);

        // Update display name to show it can be rearmed
        this.interactiveExtension.setDisplayName("rearm bear trap");

        // Remove the trigger extension
        if (this.triggerExtension) {
          this.removeExtension(this.triggerExtension);
          this.triggerExtension = null;
        }

        break;
      }
    }
  }

  private interact(entityId: string) {
    const entity = this.getEntityManager().getEntityById(entityId);
    if (!entity || entity.getType() !== Entities.PLAYER) return;

    // If disarmed, rearm the trap
    if (!this.isArmed) {
      // Clear the snared zombie reference
      this.activate();
      return;
    }

    // If armed, allow pickup
    this.getExt(Carryable).pickup(entityId);
  }
}
