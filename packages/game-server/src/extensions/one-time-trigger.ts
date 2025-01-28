import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Circle } from "@/util/shape";

interface OneTimeTriggerOptions {
  triggerRadius: number;
  targetTypes: EntityType[];
}

export default class OneTimeTrigger implements Extension {
  public static readonly type = "one-time-trigger";

  private self: IEntity;
  private triggerRadius: number;
  private targetTypes: EntityType[];
  private hasTriggered = false;
  private triggerCallback?: () => void;

  constructor(self: IEntity, options: OneTimeTriggerOptions) {
    this.self = self;
    this.triggerRadius = options.triggerRadius;
    this.targetTypes = options.targetTypes;
  }

  public onTrigger(callback: () => void) {
    this.triggerCallback = callback;
    return this;
  }

  public update(deltaTime: number) {
    if (this.hasTriggered) return;

    const positionable = this.self.getExt(Positionable);
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getCenterPosition(), this.triggerRadius, this.targetTypes);

    // Check if any target entity is within trigger radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getPosition();
      const selfPos = this.self.getExt(Positionable).getPosition();
      const distance = entityPos.sub(selfPos).length();

      if (distance <= this.triggerRadius) {
        this.hasTriggered = true;
        this.triggerCallback?.();
        break;
      }
    }
  }

  public serialize(): ExtensionSerialized {
    return {
      type: OneTimeTrigger.type,
      hasTriggered: this.hasTriggered,
    };
  }
}
