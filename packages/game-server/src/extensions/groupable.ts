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
    writer.writeString(serialized.group);
  }
}
