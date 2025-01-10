import { ExtensionTypes } from "@survive-the-night/game-server/src/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientConsumable implements ClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
