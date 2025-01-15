import { ExtensionTypes } from "@shared/geom/extension-types";
import { ClientExtension, ClientExtensionSerialized } from "./types";

export class ClientIgnitable implements ClientExtension {
  public static readonly type = ExtensionTypes.IGNITABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
