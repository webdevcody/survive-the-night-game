import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientIgnitable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.IGNITABLE;

  public deserializeFromBuffer(reader: BufferReader): this {
    // Ignitable extension has no fields
    return this;
  }
}
