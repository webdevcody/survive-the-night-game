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
    reader.readUInt32(); // numFires (not used on client)
    reader.readFloat64(); // spreadRadius (not used on client)
    return this;
  }
}
