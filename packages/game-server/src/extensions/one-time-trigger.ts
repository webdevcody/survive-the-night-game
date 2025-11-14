import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Circle } from "@/util/shape";
import { Cooldown } from "@/entities/util/cooldown";

interface OneTimeTriggerOptions {
  triggerRadius: number;
  targetTypes: EntityType[];
}

export default class OneTimeTrigger implements Extension {
  public static readonly type = "one-time-trigger";
  private static readonly CHECK_INTERVAL = 0.5; // Check for enemies every half second

  private self: IEntity;
  private triggerRadius: number;
  private targetTypes: EntityType[];
  private hasTriggered = false;
  private triggerCallback?: () => void;
  private dirty: boolean = false;
  private checkCooldown: Cooldown;

  constructor(self: IEntity, options: OneTimeTriggerOptions) {
    this.self = self;
    this.triggerRadius = options.triggerRadius;
    this.targetTypes = options.targetTypes;
    this.checkCooldown = new Cooldown(OneTimeTrigger.CHECK_INTERVAL);
    // Set random offset to spread checks across time
    this.checkCooldown.setTimeRemaining(Math.random() * OneTimeTrigger.CHECK_INTERVAL);
  }

  public onTrigger(callback: () => void) {
    this.triggerCallback = callback;
    return this;
  }

  public update(deltaTime: number) {
    if (this.hasTriggered) return;

    // Update cooldown
    this.checkCooldown.update(deltaTime);

    // Only check for enemies every half second
    if (!this.checkCooldown.isReady()) {
      return;
    }

    // Reset cooldown
    this.checkCooldown.reset();

    const positionable = this.self.getExt(Positionable);
    const targetTypesSet = new Set<EntityType>(this.targetTypes);
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getCenterPosition(), this.triggerRadius, targetTypesSet);

    // Check if any target entity is within trigger radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const selfPos = this.self.getExt(Positionable).getCenterPosition();
      const distance = entityPos.sub(selfPos).length();

      if (distance <= this.triggerRadius) {
        this.hasTriggered = true;
        this.markDirty(); // Mark dirty when triggered
        this.triggerCallback?.();
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
      type: OneTimeTrigger.type,
      hasTriggered: this.hasTriggered,
    };
  }
}
