import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientConsumable implements ClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
