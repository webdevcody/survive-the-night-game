import { ExtensionTypes } from "@shared/geom/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientExpirable implements ClientExtension {
  public static readonly type = ExtensionTypes.EXPIRABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
