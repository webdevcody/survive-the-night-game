import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

type StaticFields = Record<string, never>;

export default class Static extends ExtensionBase<StaticFields> {
  public static readonly type = ExtensionTypes.STATIC;

  public constructor(self: IEntity) {
    super(self, {});
  }

  public serializeToBuffer(writer: BufferWriter, onlyDirty: boolean = false): void {
    writer.writeUInt8(encodeExtensionType(Static.type));
  }
}
