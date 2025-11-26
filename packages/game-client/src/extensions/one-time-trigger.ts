import { BaseClientExtension } from "./base-extension";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientOneTimeTrigger extends BaseClientExtension {
  public static readonly type = ExtensionTypes.ONE_TIME_TRIGGER;
  private hasTriggered = false;

  public deserializeFromBuffer(reader: BufferReader): this {
    this.hasTriggered = reader.readBoolean();
    return this;
  }
}
