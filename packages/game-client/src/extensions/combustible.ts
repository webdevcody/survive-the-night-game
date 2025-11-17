import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientCombustible extends BaseClientExtension {
  public static readonly type = ExtensionTypes.COMBUSTIBLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now)
    const fieldCount = reader.readUInt8();
    
    // Read fields by index (client doesn't use these values, but must read them)
    for (let i = 0; i < fieldCount; i++) {
      const fieldIndex = reader.readUInt8();
      // Field indices: numFires = 0, spreadRadius = 1
      if (fieldIndex === 0) {
        reader.readUInt32(); // numFires
      } else if (fieldIndex === 1) {
        reader.readFloat64(); // spreadRadius
      }
    }
    return this;
  }
}
