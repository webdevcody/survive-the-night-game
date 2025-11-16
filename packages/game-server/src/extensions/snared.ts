import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Snared.type));
  }
}
