import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";

export default class Static implements Extension {
  public static readonly type = ExtensionTypes.STATIC;

  private self: IEntity;
  private dirty: boolean = false;

  public constructor(self: IEntity) {
    this.self = self;
  }

  public isDirty(): boolean {
    return this.dirty;
  }

  public markDirty(): void {
    this.dirty = true;
    if (this.self.markExtensionDirty) {
      this.self.markExtensionDirty(this);
    }
  }

  public clearDirty(): void {
    this.dirty = false;
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Static.type,
    };
  }
}
