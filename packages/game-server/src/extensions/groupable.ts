import { IEntity } from "@/entities/types";
import { Extension } from "@/extensions/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

export type Group = "friendly" | "enemy";

export default class Groupable extends ExtensionBase {
  public static readonly type = "groupable";

  constructor(self: IEntity, group: Group) {
    super(self, { group });
  }

  public getGroup(): Group {
    const serialized = this.serialized as any;
    return serialized.group;
  }

  public setGroup(group: Group): void {
    const serialized = this.serialized as any;
    serialized.group = group;
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    const serialized = this.serialized as any;
    writer.writeUInt8(encodeExtensionType(Groupable.type));

    if (onlyDirty) {
      const dirtyFields = this.serialized.getDirtyFields();
      if (dirtyFields.has("group")) {
        writer.writeUInt8(1); // field count
        writer.writeUInt8(0); // field index (group = 0)
        writer.writeString(serialized.group);
      } else {
        writer.writeUInt8(0); // no fields
      }
    } else {
      // Write all fields: field count = 1, then field
      writer.writeUInt8(1); // field count
      writer.writeUInt8(0); // group index
      writer.writeString(serialized.group);
    }
  }
}
