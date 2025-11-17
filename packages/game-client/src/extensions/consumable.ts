import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientConsumable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    // Type is already read by the entity deserializer
    // Read field count (always present now, should be 0 for Consumable extension)
    const fieldCount = reader.readUInt8();
    // Consumable extension has no fields, so nothing to read
    return this;
  }
}
