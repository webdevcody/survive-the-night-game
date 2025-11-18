import { Extension } from "@/extensions/types";
import { IEntity } from "@/entities/types";
import { ExtensionTypes } from "@/util/extension-types";
import { BufferWriter, MonitoredBufferWriter } from "@shared/util/buffer-serialization";
import { encodeExtensionType } from "@shared/util/extension-type-encoding";
import { ExtensionBase } from "./extension-base";

export default class Static extends ExtensionBase {
  public static readonly type = ExtensionTypes.STATIC;

  public constructor(self: IEntity) {
    super(self, {});
  }

  public serializeToBuffer(writer: BufferWriter | MonitoredBufferWriter, onlyDirty: boolean = false): void {
    if (writer instanceof MonitoredBufferWriter || (writer as any).constructor?.name === 'MonitoredBufferWriter') {
      (writer as MonitoredBufferWriter).writeUInt8(encodeExtensionType(Static.type), "ExtensionType");
    } else {
      writer.writeUInt8(encodeExtensionType(Static.type));
    }
  }
}
