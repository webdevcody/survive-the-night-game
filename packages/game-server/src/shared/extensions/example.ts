import { GenericEntity } from "../entities";
import { Extension, ExtensionNames, ExtensionSerialized } from "./types";

export default class Example implements Extension {
  public static readonly Name = ExtensionNames.positionable;

  private self: GenericEntity;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      name: Example.Name,
    };
  }
}
