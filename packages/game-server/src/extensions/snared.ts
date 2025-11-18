import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
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

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Snared.type), "ExtensionType");
    } else {
      writer.writeUInt8(encodeExtensionType(Snared.type));
    }
  }
}
