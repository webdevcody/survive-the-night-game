import { GenericEntity } from "../generic-entity";
import { Extension, ExtensionSerialized } from "./types";

export default class Example implements Extension {
  public static readonly type = "example";

  private self: GenericEntity;

  public constructor(self: GenericEntity) {
    this.self = self;
  }

  public deserialize(data: ExtensionSerialized): this {
    return this;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Example.type,
    };
  }
}
