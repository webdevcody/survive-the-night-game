import { IEntity } from "@/entities/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

type ConsumableHandler = (entityId: string, idx: number) => void;

export default class Consumable implements Extension {
  public static readonly type = "consumable";

  private self: IEntity;
  private handler: ConsumableHandler | null = null;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public onConsume(handler: ConsumableHandler): this {
    this.handler = handler;
    return this;
  }

  public consume(entityId: string, idx: number): void {
    this.handler?.(entityId, idx);
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Consumable.type,
    };
  }
}
