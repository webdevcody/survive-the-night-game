import { ExtensionTypes } from "../../../game-shared/src/util/extension-types";
import { ClientExtensionSerialized } from "@/extensions/types";
import { BaseClientExtension } from "./base-extension";

export class ClientConsumable extends BaseClientExtension {
  public static readonly type = ExtensionTypes.CONSUMABLE;

  public deserialize(data: ClientExtensionSerialized): this {
    return this;
  }
}
