import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BaseClientExtension } from "./base-extension";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientConsumable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserializeFromBuffer(reader: BufferReader): this {
    // Consumable extension has no fields
    return this;
  }
}
