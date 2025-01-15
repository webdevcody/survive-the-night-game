import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientConsumable implements ClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
