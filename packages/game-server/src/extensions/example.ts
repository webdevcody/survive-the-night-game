import { IEntity } from "@shared/geom/types";
import { Extension, ExtensionSerialized } from "@/extensions/types";

export default class Example implements Extension {
  public static readonly type = "example";

  private self: IEntity;

  public constructor(self: IEntity) {
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
