import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";
import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";

export class ClientLandmineUpdate extends BaseClientExtension {
  public static readonly type = ExtensionTypes.LANDMINE_UPDATE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
