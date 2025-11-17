import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

/**
 * Extension that marks an entity as snared/immobilized
 * When present, the entity should not be able to move
 */
export default class Snared extends ExtensionBase {
  public static readonly type = "snared";

  public constructor(self: IEntity) {
    super(self, {});
  }

  public serializeToBuffer(writer: BufferWriter): void {
    writer.writeUInt8(encodeExtensionType(Snared.type));
  }
}
