import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientCarryable implements ClientExtension {
  public static readonly type = ExtensionTypes.CARRYABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
