import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Circle } from "@/util/shape";
import Destructible from "./destructible";

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

    const triggerBox = this.getTriggerBox();
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntitiesByRange(triggerBox, this.targetTypes)
      .filter((entity) => entity.hasExt(Destructible) && !entity.getExt(Destructible).isDead());

    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      this.hasTriggered = true;
      this.triggerCallback?.();
      break;
    }
  }

  public getTriggerBox(): Circle {
    const positionable = this.self.getExt(Positionable);
    const position = positionable.getCenterPosition();
    return new Circle(position, this.triggerRadius);
  }

  public serialize(): ExtensionSerialized {
    return {
      type: OneTimeTrigger.type,
      hasTriggered: this.hasTriggered,
    };
  }
}
