import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { EntityType } from "@/types/entity";
import Positionable from "@/extensions/positionable";
import { Circle } from "@/util/shape";
import { Cooldown } from "@/entities/util/cooldown";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

interface OneTimeTriggerOptions {
  triggerRadius: number;
  targetTypes: EntityType[];
}

type OneTimeTriggerFields = {
  hasTriggered: boolean;
  triggerRadius: number;
  targetTypes: EntityType[];
};

export default class OneTimeTrigger extends ExtensionBase<OneTimeTriggerFields> {
  public static readonly type = "one-time-trigger";
  private static readonly CHECK_INTERVAL = 0.5; // Check for enemies every half second

  private triggerRadius: number;
  private targetTypes: EntityType[];
  private triggerCallback?: () => void;
  private checkCooldown: Cooldown;

  constructor(self: IEntity, options: OneTimeTriggerOptions) {
    super(self, { hasTriggered: false, triggerRadius: options.triggerRadius, targetTypes: options.targetTypes });
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
    if (this.serialized.get('hasTriggered')) return;

    // Update cooldown
    this.checkCooldown.update(deltaTime);

    // Only check for enemies every half second
    if (!this.checkCooldown.isReady()) {
      return;
    }

    // Reset cooldown
    this.checkCooldown.reset();

    const positionable = this.self.getExt(Positionable);
    // Use serialized values for consistency (these never change after construction, but good practice)
    const targetTypesSet = new Set<EntityType>(this.serialized.get('targetTypes'));
    const triggerRadius = this.serialized.get('triggerRadius');
    const nearbyEntities = this.self
      .getEntityManager()
      .getNearbyEntities(positionable.getCenterPosition(), triggerRadius, targetTypesSet);

    // Check if any target entity is within trigger radius
    for (const entity of nearbyEntities) {
      if (!entity.hasExt(Positionable)) continue;

      const entityPos = entity.getExt(Positionable).getCenterPosition();
      const selfPos = this.self.getExt(Positionable).getCenterPosition();
      const distance = entityPos.clone().sub(selfPos).length();

      if (distance <= triggerRadius) {
        this.serialized.set('hasTriggered', true);
        this.triggerCallback?.();
        break;
      }
    }
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(OneTimeTrigger.type));
    writer.writeBoolean(this.serialized.get('hasTriggered'));
  }
}
