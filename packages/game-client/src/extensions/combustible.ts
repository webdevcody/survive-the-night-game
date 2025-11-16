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
    // Server sends numFires and spreadRadius, but client doesn't use them
    reader.readUInt32(); // numFires
    reader.readFloat64(); // spreadRadius
    return this;
  }
}
