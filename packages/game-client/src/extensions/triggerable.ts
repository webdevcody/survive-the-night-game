import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientTriggerable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.TRIGGERABLE;

  public deserializeFromBuffer(reader: BufferReader): this {
    reader.readFloat64(); // width (not used on client)
    reader.readFloat64(); // height (not used on client)
    return this;
  }
}
