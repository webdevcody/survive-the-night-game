import { Extension, ExtensionSerialized } from "@/extensions/types";
import { IEntity } from "@/entities/types";

/**
 * Placeable extension marks entities that are structures placed on the ground
 * (walls, spikes, mines, bear traps, etc.) as opposed to dropped items.
 * 
 * This is used to determine if an item requires holding F to pick up.
 * Placeable items require holding F, while regular droppable items are instant.
 */
export default class Placeable implements Extension {
  public static readonly type = "placeable" as const;

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

  public serializeDirty(): ExtensionSerialized | null {
    if (!this.dirty) {
      return null;
    }
    return this.serialize();
  }

  public serialize(): ExtensionSerialized {
    return {
      type: Placeable.type,
    };
  }
}
