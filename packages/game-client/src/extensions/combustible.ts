import { ExtensionTypes } from "@server/shared/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientCombustible implements ClientExtension {
  public static readonly type = ExtensionTypes.COMBUSTIBLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
