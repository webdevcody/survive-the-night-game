import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientTriggerable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TRIGGERABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field index: size = 0 (sends width and height as two Float64 values)
      if (fieldIndex === 0) {
        reader.readFloat64(); // width
        reader.readFloat64(); // height
      }
    }
    return this;
  }
}
