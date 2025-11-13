import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";

/**
 * Extension that marks an entity as snared/immobilized
 * When present, the entity should not be able to move
 */
export default class Snared implements Extension {
  public static readonly type = "snared";

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
      type: Snared.type,
    };
  }
}
