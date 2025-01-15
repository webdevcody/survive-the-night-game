import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientTriggerable implements ClientExtension {
  public static readonly type = ExtensionTypes.TRIGGERABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
