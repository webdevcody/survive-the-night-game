import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt8(encodeExtensionType(Placeable.type));
  }
}
