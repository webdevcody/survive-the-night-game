import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";

type UpdateFunction = (deltaTime: number) => void;

export default class Updatable implements Extension {
  public static readonly type = "updatable";

  private serialized?: ExtensionSerialized;
  private self: Entity;
  private updateFunction: UpdateFunction;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: Entity, updateFunction: UpdateFunction) {
    this.self = self;
    this.updateFunction = updateFunction;
  }

  public setUpdateFunction(cb: UpdateFunction) {
    this.updateFunction = cb;
    return this;
  }

  public update(deltaTime: number) {
    this.updateFunction(deltaTime);
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    if (!this.serialized) {
      this.serialized = {
        type: Updatable.type,
      };
    }
    return this.serialized;
  }
}
