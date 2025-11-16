import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";

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

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt32(encodeExtensionType(Static.type));
  }
}
