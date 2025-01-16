import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";

export class ClientExpirable implements ClientExtension {
  public static readonly type = ExtensionTypes.EXPIRABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
