import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";

export default class Static implements Extension {
  public static readonly type = ExtensionTypes.STATIC;

  private self: IEntity;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Static.type,
    };
  }
}
