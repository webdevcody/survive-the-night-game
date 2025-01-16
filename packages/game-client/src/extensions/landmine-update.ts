import { ClientExtension, ClientExtensionSerialized } from "@/extensions/types";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";

export class ClientLandmineUpdate implements ClientExtension {
  public static readonly type = ExtensionTypes.LANDMINE_UPDATE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
