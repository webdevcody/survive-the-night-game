import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { BufferReader } from "@shared/util/buffer-serialization";

export class ClientOneTimeTrigger extends BaseClientExtension {
  public static readonly type = ExtensionTypes.ONE_TIME_TRIGGER;
  private hasTriggered = false;

  public deserialize(data: ClientExtensionSerialized): this {
    this.hasTriggered = data.hasTriggered ?? false;
    return this;
  }

  public deserializeFromBuffer(reader: BufferReader): this {
    this.hasTriggered = reader.readBoolean();
    return this;
  }
}
