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
    // Triggerable has no serialized fields (width/height are derived from size)
    // But server sends width and height, so read them (even though we don't use them)
    reader.readFloat64(); // width
    reader.readFloat64(); // height
    return this;
  }
}
