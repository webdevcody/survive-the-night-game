import { Entity } from "../entity";
import { Extension, ExtensionSerialized } from "./types";

export default class Example implements Extension {
  public static readonly type = "example";

  private self: Entity;

  public constructor(self: Entity) {
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
