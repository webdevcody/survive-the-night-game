import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import { distance } from "../../../game-shared/src/util/physics";
import Positionable from "@/extensions/positionable";

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

    const position = this.self.getExt(Positionable).getCenterPosition();
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities(position, undefined, this.targetTypes);

    // Check if any target entity is within trigger radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const dist = distance(position, entityPos);

      // If entity is close enough, trigger
      if (dist < this.triggerRadius) {
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
