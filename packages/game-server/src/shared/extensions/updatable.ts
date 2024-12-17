import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

export default class Updatable implements Extension {
  public static readonly Name = ExtensionNames.updatable;

  private self: GenericEntity;
  private updateFunction: (deltaTime: number) => void;
  /**
   * will create a trigger box around an entity which should be used for various purposes.
   */
  public constructor(self: GenericEntity, updateFunction: (deltaTime: number) => void) {
    this.self = self;
    this.updateFunction = updateFunction;
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
