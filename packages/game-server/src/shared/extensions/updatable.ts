import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

type UpdateFunction = (deltaTime: number) => void;

export default class Updatable implements Extension {
  public static readonly Name = ExtensionNames.updatable;

  private self: GenericEntity;
  private updateFunction: UpdateFunction;

  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: GenericEntity, updateFunction: UpdateFunction) {
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
    return {
      name: Updatable.Name,
    };
  }
}
